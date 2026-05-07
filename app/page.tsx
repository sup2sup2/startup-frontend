"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { Map, MapMarker } from "react-kakao-maps-sdk";

interface Report {
  id: number;
  latitude: number;
  longitude: number;
  imageUrl: string;
  description: string; // 🌟 인터페이스에 설명 추가
  loginId?: string;
}

// 🌟 날씨 데이터를 위한 인터페이스
interface WeatherData {
  district: string;
  rainfall: number; // 시간당 강우량 (mm)
}

export default function Home() {
  const [location, setLocation] = useState({ lat: 37.5665, lng: 126.9780 });
  const [status, setStatus] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [description, setDescription] = useState(""); 
  
  // 🌟 처음에 사이트에 들어오면 'weather' 탭을 보여줍니다.
  const [activeTab, setActiveTab] = useState("weather"); 
  
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [signupId, setSignupId] = useState("");
  const [signupPassword, setSignupPassword] = useState("");

  const [isIdChecked, setIsIdChecked] = useState(false);
  
  const [user, setUser] = useState<{loginId: string, points: number} | null>(null);
  
  const [editingId, setEditingId] = useState<number | null>(null); // 현재 수정 중인 신고글 ID
  const [editDescription, setEditDescription] = useState(""); // 수정 중인 입력칸 내용
  // 초기 상태를 빈 배열로 두고, 로딩 상태를 추가합니다.
  const [weathers, setWeathers] = useState<WeatherData[]>([]);
  const [isWeatherLoading, setIsWeatherLoading] = useState(true);

  const [showWarningModal, setShowWarningModal] = useState(false);
  
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://192.168.0.10:8080";


  const sanitizeHTML = (text: string) => {
  return text
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
  };

  const fetchReports = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/reports`);
      if (response.ok) {
        const data = await response.json();
        setReports(data);
      }
    } catch (error) {
      console.error("데이터 불러오기 실패:", error);
    }
  };
  // 🌟 [추가] 신고 내역 수정 함수 (PUT)
  const handleEditReport = async (id: number) => {
    if (editDescription.length > 100) {
      alert("최대 100자까지만 입력 가능합니다.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: editDescription }),
      });

      if (response.ok) {
        alert("성공적으로 수정되었습니다.");
        setEditingId(null); // 수정 완료 후 다시 일반 모드로 변경
        fetchReports(); // 목록 새로고침
      } else {
        alert("수정에 실패했습니다.");
      }
    } catch (error) {
      console.error("수정 통신 에러:", error);
    }
  };

  // 🌟 [추가] 신고 내역 삭제 함수 (DELETE)
  const handleDeleteReport = async (id: number) => {
    if (!confirm("정말 이 신고 기록을 삭제하시겠습니까? (사진 파일도 삭제됩니다)")) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        alert("완전히 삭제되었습니다.");
        fetchReports(); // 삭제 후 목록 새로고침
      } else {
        alert("삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("삭제 통신 에러:", error);
    }
  };

  // 🌟 2. 서울시 실시간 강우량 데이터를 불러오는 함수 추가
  const fetchRealTimeWeather = async () => {
    setIsWeatherLoading(true);
    try {
      // 🌟 백엔드 프록시로 변경 - API 키 노출 없음, HTTPS 호환
    const response = await fetch(`${API_BASE_URL}/api/weather/rainfall`);
    const data = await response.json();


      if (data.ListRainfallService && data.ListRainfallService.row) {
        const rows = data.ListRainfallService.row;

        // API에서 관측소별로 데이터를 주므로, '구 이름'을 기준으로 정리합니다.
        // RAINFALL10은 10분당 강우량이므로, 대략적인 시간당 강우량을 위해 * 6을 해줍니다.
        const realTimeData = rows.map((item: any) => ({
          district: item.GU_NM,
          rainfall: Math.floor(Number(item.RN_10M) * 6)
        }));

        // 구 이름이 중복되는 경우 하나만 남기기 (간단한 필터링)
        const uniqueData = Array.from(new globalThis.Map<string, WeatherData>(realTimeData.map((item: any) => [item.district, item] as [string, WeatherData])).values());

        // 서울시 25개 구 중 비가 많이 오는 순서대로 정렬해서 보여주기
        uniqueData.sort((a, b) => b.rainfall - a.rainfall);

        setWeathers(uniqueData);
      }
    } catch (error) {
      console.error("날씨 데이터를 불러오는데 실패했습니다.", error);
      // API 호출 실패 시 에러 방지용 임시 데이터
      setWeathers([
        { district: "서울 전역", rainfall: 0 }
      ]);
    } finally {
      setIsWeatherLoading(false);
    }
  };

  // 🌟 3. 컴포넌트가 처음 화면에 나타날 때 데이터들을 불러옵니다.
  useEffect(() => {
    fetchReports();
    fetchRealTimeWeather();
    
    // (선택사항) 10분마다 강우량 데이터를 자동으로 새로고침합니다.
    const interval = setInterval(fetchRealTimeWeather, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);



  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setImagePreview(URL.createObjectURL(file));
      setStatus("사진 확인됨. 현재 위치를 매칭하는 중...");
      
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
            setStatus("위치 매칭 완료! 내용을 입력하고 신고하세요. ✅");
          },
          (error) => { setStatus("위치를 가져오지 못했습니다. (GPS 확인)"); },
          { enableHighAccuracy: true }
        );
      }
    }
  };

  const handleSubmit = async () => {
  
  // 🌟 추가: 로그인이 안 되어 있다면 막기
    if (!user || !user.loginId) {
      alert("신고하려면 먼저 로그인을 해주세요!");
      setActiveTab("login"); // 로그인 탭으로 쫓아냄(?)
      return;
    }

    if (!uploadFile || location.lat === 0) {
      alert("사진과 위치 정보가 필요합니다!");
      return;
    }
    
    // 🌟 XSS 공격 방어 적용
    const safeDescription = sanitizeHTML(description);

    const formData = new FormData();
    formData.append("latitude", location.lat.toString());
    formData.append("longitude", location.lng.toString());
    formData.append("image", uploadFile);
    formData.append("description", safeDescription); // 🌟 안전한 텍스트로 교체
    formData.append("loginId", user.loginId);

    try {
      setStatus("신고 접수 중...");
      const response = await fetch(`${API_BASE_URL}/api/reports`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        // 🌟 1. 새로고침 대신 상태만 업데이트!
        alert("🚨 신고가 성공적으로 완료되었습니다! 100포인트가 적립되었습니다.");

        // 🌟 2. 프론트엔드에서 포인트 즉시 올리기 (백엔드 DB엔 이미 올라갔으므로 화면만 동기화)
        setUser({
          ...user,
          points: user.points + 100
        });

        // 🌟 3. 입력 필드 초기화 (신고가 끝났으니 칸 비우기)
        setImagePreview("");
        setUploadFile(null);
        setDescription("");
        setStatus("추가 신고 준비 완료 ✅");

        // 🌟 4. 지도에 새 마커 표시를 위해 목록 새로고침 (함수 재실행)
        fetchReports(); 

      } else {
        const errorMsg = await response.text();
        alert("🚨 실패: " + errorMsg);
      }
    } catch (error) {
      setStatus("❌ 전송 실패");
      alert("서버 연결에 실패했습니다.");
    }
  };

  // 🌟 로그인 처리 함수
  const handleLogin = async () => {
    if (!loginId || !password) {
      alert("아이디와 비밀번호를 모두 입력해주세요.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/members/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId, password }),
      });

      // 백엔드에서 보낸 메시지(String)를 읽어옵니다.
      const message = await response.text();

      if (response.ok) {
        // 로그인 성공 시 (HTTP 200)
        alert("🎉 " + message);
        // 로그인 성공 시 user 정보를 세팅! (포인트는 임시로 0점 시작)
        setUser({ loginId: loginId, points: 0 });
        
        // (참고: 실제 앱이라면 여기서 받은 토큰이나 회원 정보를 저장해야 합니다)
      } else {
        // 로그인 실패, 계정 잠김 등 (HTTP 401, 403)
        alert("🚨 " + message); 
      }
    } catch (error) {
      alert("서버와 연결할 수 없습니다. 서버가 켜져 있는지 확인해주세요.");
    }
  };

  // 🌟 회원가입 처리 함수
  const handleSignup = async () => {
    if (!signupId || !signupPassword) {
      alert("사용할 아이디와 비밀번호를 모두 입력해주세요.");
      return;
    }
      // 🌟 1. 중복 확인 체크
    if (!isIdChecked) {
      alert("아이디 중복 확인을 진행해주세요.");
      return;
    }

    // 🌟 2. 비밀번호 영문자 + 특수문자 포함 및 8자 이상 체크 정규식
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*[!@#$%^&*()_+={}\[\]:;"'<>,.?/\\|`~]).{8,20}$/;
    if (!passwordRegex.test(signupPassword)) {
      alert("비밀번호는 영문자와 특수문자를 포함하여 8~20자로 설정해주세요.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/members/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId: signupId, password: signupPassword }),
      });

      const message = await response.text();

      if (response.ok) {
        alert("🎉 " + message); // "회원가입 성공!" 알림
        setActiveTab("login"); // 가입 성공하면 다시 로그인 화면으로 자동 이동
        setSignupId(""); // 입력했던 칸 비워주기
        setSignupPassword("");
        setIsIdChecked(false); // 🌟 상태 초기화
      } else {
        alert("🚨 " + message); // "이미 존재하는 아이디입니다" 등
      }
    } catch (error) {
      alert("서버와 연결할 수 없습니다.");
    }
  };

    // 🌟 아이디 중복 확인 함수
  const handleCheckDuplicateId = async () => {
    if (!signupId) {
      alert("아이디를 먼저 입력해주세요.");
      return;
    }
    if (signupId.length < 4) {
      alert("아이디는 최소 4자 이상이어야 합니다.");
      return;
    }

    try {
      // 🚨 백엔드 API 주소에 맞게 수정이 필요할 수 있습니다. (예: /api/members/check-id)
      const response = await fetch(`${API_BASE_URL}/api/members/check-id?loginId=${signupId}`);
      
      if (response.ok) {
        alert("사용 가능한 아이디입니다! 🟢");
        setIsIdChecked(true); // 중복확인 통과!
      } else {
        alert("이미 사용 중인 아이디입니다. 🔴");
        setIsIdChecked(false);
      }
    } catch (error) {
      alert("서버 연결 실패. (임시로 중복확인 통과 처리합니다)");
      // API가 아직 없다면 테스트를 위해 임시로 true 처리하려면 아래 주석 해제
      // setIsIdChecked(true); 
    }
  };

  // 🌟 강우량에 따라 캐릭터와 상태를 반환!
  const getWeatherStatus = (rainfall: number) => {
    if (rainfall >= 30) {
      return { 
        emoji: "😭", character: "🌊", bgColor: "bg-red-100", textColor: "text-red-700",
        message: "꼬르륵... 배수구가 막힐 것 같아요! 살려주세요!",
        level: "위험"
      };
    } else if (rainfall >= 10) {
      return { 
        emoji: "😥", character: "🌧️", bgColor: "bg-yellow-100", textColor: "text-yellow-700",
        message: "비가 제법 오네요. 우산 챙기시고 조심하세요!",
        level: "주의"
      };
    } else {
      return { 
        emoji: "😆", character: "🌞", bgColor: "bg-green-100", textColor: "text-green-700",
        message: "뽀송뽀송 기분 좋아요! 현재는 안전해요.",
        level: "안전"
      };
    }
  };

  return (
    <main className="flex flex-col items-center min-h-screen bg-gradient-to-b from-sky-100 via-cyan-50 to-blue-50 pb-28 relative overflow-x-hidden">
      
      {/* 🌟 배경 장식 - 둥둥 떠다니는 물방울 */}
      <div className="fixed top-10 left-4 text-4xl opacity-20 animate-pulse pointer-events-none">💧</div>
      <div className="fixed top-32 right-6 text-3xl opacity-15 pointer-events-none">☁️</div>
      <div className="fixed bottom-32 left-8 text-3xl opacity-15 pointer-events-none">💧</div>

      {/* 🌟 1. 날씨 대시보드 화면 (처음 진입 시 보임) */}
      {activeTab === "weather" && (
        <div className="w-full max-w-lg flex flex-col items-center p-5 animate-fade-in mt-2 relative z-10">
          
          {/* 🌟 마스코트 헤더 카드 */}
          <div className="w-full bg-gradient-to-br from-sky-400 via-sky-500 to-cyan-500 rounded-3xl p-6 mb-6 shadow-xl shadow-sky-300/40 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-white/25 backdrop-blur-sm text-white text-[10px] font-bold px-3 py-1 rounded-full">
                  서울특별시
                </span>
              </div>
              <h1 className="text-2xl font-black text-white drop-shadow-sm">
                서울시 지역별 위험도
              </h1>
              <p className="text-white/90 text-sm mt-1 font-medium">
                실시간 강우량 모니터링 🌦️
              </p>
            </div>
            <div className="absolute -right-2 -bottom-3 text-8xl opacity-30">💧</div>
            <div className="absolute right-16 -top-2 text-3xl opacity-25">☔</div>
          </div>

          {/* 🌟 로딩 중일 때 보여줄 화면 */}
          {isWeatherLoading ? (
            <div className="py-20 flex flex-col items-center bg-white rounded-3xl w-full shadow-sm">
              <div className="text-5xl animate-bounce mb-4">☔</div>
              <p className="text-sky-600 font-bold">기상청 데이터를 불러오는 중...</p>
              <p className="text-sky-400 text-xs mt-1">잠시만 기다려주세요 🐾</p>
            </div>
          ) : (
            <div className="w-full flex flex-col gap-3">
              {/* 🌟 로딩이 끝나면 실제 날씨 데이터를 그려줍니다 */}
              {weathers?.map((data, idx) => {
                const status = getWeatherStatus(data.rainfall);
                return (
                  <div key={idx} className={`p-5 rounded-3xl shadow-md ${status.bgColor === 'bg-red-100' ? 'shadow-red-200/60 ring-2 ring-red-200 animate-pulse' : 'shadow-sky-100/50'} bg-white flex items-center justify-between transition-all hover:shadow-lg hover:-translate-y-0.5`}>
                    
                    {/* 왼쪽: 지역 정보 및 강우량 */}
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <h3 className="text-xl font-black text-gray-800">{data.district}</h3>
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-black ${status.bgColor} ${status.textColor} shadow-sm`}>
                          {status.level}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-500">
                        시간당 강우량
                      </p>
                      <p className="text-lg font-black text-sky-600 mt-0.5">
                        {data.rainfall}<span className="text-sm font-bold text-sky-400 ml-0.5">mm</span>
                      </p>
                    </div>

                    {/* 오른쪽: 캐릭터 및 말풍선 */}
                    <div className="relative flex flex-col items-center">
                      <div className={`w-20 h-20 rounded-full flex items-center justify-center text-5xl shadow-inner ${status.bgColor} border-4 border-white shadow-md`}>
                        {status.emoji}
                      </div>
                      {/* 말풍선 */}
                      <div className="absolute top-[-32px] right-6 bg-gray-800 text-white text-[10px] px-2.5 py-1.5 rounded-xl whitespace-nowrap shadow-lg opacity-95 font-medium">
                        {status.message}
                        <div className="absolute bottom-[-4px] right-4 w-2 h-2 bg-gray-800 rotate-45"></div>
                      </div>
                    </div>

                  </div>
                )
              })}
            </div>
          )}

          <div className="mt-6 bg-gradient-to-br from-amber-50 to-orange-50 p-5 rounded-3xl w-full text-center shadow-sm border-2 border-amber-100">
            <div className="text-3xl mb-2">📣</div>
            <p className="text-sm text-amber-900 font-bold leading-relaxed">
              위험 지역에 계신가요?<br/>
              <span className="text-amber-700">'지도/신고'</span> 탭에서 막힌 하수구를 제보해주세요!
            </p>
          </div>
        </div>
      )}

      {/* 🌟 2. 지도 및 신고 화면 */}
      {activeTab === "home" && (
        <div className="w-full max-w-lg flex flex-col items-center p-5 relative z-10">
          
          {/* 🌟 마스코트 헤더 카드 */}
          <div className="w-full bg-gradient-to-br from-orange-400 via-rose-400 to-pink-500 rounded-3xl p-6 mb-6 shadow-xl shadow-rose-300/40 relative overflow-hidden mt-2">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-white/25 backdrop-blur-sm text-white text-[10px] font-bold px-3 py-1 rounded-full">
                  시민 참여형 신고
                </span>
              </div>
              <h1 className="text-2xl font-black text-white drop-shadow-sm">
                침수 방지 하수구 신고
              </h1>
              <p className="text-white/90 text-sm mt-1 font-medium">
                내 주변 위험 요소를 알려주세요 🚨
              </p>
            </div>
            <div className="absolute -right-3 -bottom-3 text-7xl opacity-30">🦺</div>
            <div className="absolute right-20 -top-1 text-2xl opacity-30">⚠️</div>
          </div>

          {/* 기존 지도 영역 */}
          <div className="w-full h-[350px] rounded-3xl overflow-hidden shadow-lg mb-6 border-[6px] border-white">
            <Map center={{ lat: location.lat, lng: location.lng }} style={{ width: "100%", height: "100%" }} level={3}>
              {location.lat !== 37.5665 && (
                <MapMarker position={{ lat: location.lat, lng: location.lng }}>
                  <div className="p-1 text-xs text-blue-600 font-bold">내 위치</div>
                </MapMarker>
              )}
              {reports.map((report) => (
                <MapMarker key={report.id} position={{ lat: report.latitude, lng: report.longitude }} image={{ src: "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png", size: { width: 24, height: 35 } }}>
                  <div className="p-1 text-xs text-red-500 font-bold">신고됨!</div>
                </MapMarker>
              ))}
            </Map>
          </div>

          {/* 기존 입력 영역 (로그인 여부에 따라 다르게 보임) */}
          <div className="bg-white p-6 rounded-3xl shadow-md w-full flex flex-col gap-4 border border-sky-100">
            
            {/* 🌟 만약 user가 없다면(로그인 전) 로그인 유도 화면 띄우기 */}
            {!user ? (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-gradient-to-br from-sky-100 to-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                  <span className="text-4xl">🔒</span>
                </div>
                <h3 className="text-lg font-black text-gray-800 mb-2">로그인 후 신고할 수 있어요</h3>
                <p className="text-sm text-gray-500 mb-5 leading-relaxed">안전한 도시를 만들고<br/>포인트도 받아가세요! 🪙</p>
                <button 
                  onClick={() => setActiveTab("login")}
                  className="bg-gradient-to-r from-sky-500 to-blue-600 text-white px-6 py-4 rounded-2xl font-black hover:shadow-lg hover:-translate-y-0.5 transition-all w-full shadow-md shadow-sky-300/40"
                >
                  로그인하러 가기 →
                </button>
              </div>
            ) : (
              /* 🌟 user가 있다면(로그인 후) 기존 신고 폼 보여주기 */
              <>
                <label className="bg-gradient-to-br from-emerald-400 to-green-500 text-white py-5 rounded-2xl hover:shadow-lg hover:-translate-y-0.5 font-black text-center cursor-pointer transition-all shadow-md shadow-emerald-300/40 block w-full text-lg">
                  📸 하수구 사진 찍기
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>

                <div className="text-sm text-gray-600 text-center bg-sky-50 p-4 rounded-2xl border-2 border-sky-100 border-dashed">
                  <p className="font-bold text-sky-700">{status || "👆 버튼을 눌러 사진을 찍어주세요"}</p>
                </div>

                {imagePreview && (
                  <>
                    <img src={imagePreview} alt="미리보기" className="w-full h-auto max-h-60 object-contain rounded-2xl shadow-sm border-2 border-sky-100 bg-gray-50" />
                    
                    <textarea
                      className="w-full border-2 border-sky-100 rounded-2xl p-4 h-32 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-300 text-gray-900 bg-sky-50/30 placeholder-gray-400 transition-all resize-none font-medium"
                      placeholder="하수구 상태를 상세히 적어주세요. ✍️"
                      value={description}
                      maxLength={100} // 🌟 1. 글자수 제한
                      onChange={(e) => setDescription(e.target.value)}
                    />
                    {/* 🌟 2. 글자수 카운터 표시 */}
                    <div className="text-right text-sm text-gray-500 -mt-2">
                      <span className={description.length >= 100 ? "text-rose-500 font-bold" : "font-medium"}>
                        {description.length}
                      </span>
                      <span className="text-gray-400"> / 100</span>
                    </div>

                    <button 
                      onClick={() => setShowWarningModal(true)} 
                      className="bg-gradient-to-r from-rose-500 to-red-500 text-white py-4 rounded-2xl hover:shadow-lg hover:-translate-y-0.5 font-black transition-all w-full text-lg shadow-md shadow-rose-300/40 mt-1"
                    >
                      🚨 이곳을 신고하기
                    </button>
                  </>
                )}
              </>
            )}

          </div>
        </div>
      )}

      {/* 🌟 3. 로그인 / 내 정보 탭 화면 */}
      {activeTab === "login" && (
        <div className="w-full max-w-lg flex flex-col items-center p-5 mt-2 relative z-10">
          
          {!user ? (
            /* 🔴 로그인 전: 기존 로그인 화면 */
            <>
              {/* 🌟 마스코트 환영 카드 */}
              <div className="w-full bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-500 rounded-3xl p-6 mb-6 shadow-xl shadow-blue-300/40 relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-white/25 backdrop-blur-sm text-white text-[10px] font-bold px-3 py-1 rounded-full">
                      WELCOME BACK
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-white drop-shadow-sm">
                    안녕하세요!
                  </h2>
                  <p className="text-white/90 text-sm mt-1 font-medium">
                    도시 수호자님, 다시 만나서 반가워요 🛡️
                  </p>
                </div>
                <div className="absolute -right-2 -bottom-3 text-7xl opacity-30">👤</div>
                <div className="absolute right-20 top-2 text-2xl opacity-25">✨</div>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-md w-full flex flex-col gap-3 border border-sky-100">
                <div>
                  <label className="text-xs font-black text-sky-700 ml-1 mb-1 block">아이디</label>
                  <input 
                    type="text" 
                    placeholder="아이디를 입력하세요 (최대 20자)" 
                    value={loginId} 
                    maxLength={20} // 🌟 글자수 제한 추가
                    onChange={(e) => setLoginId(e.target.value)}
                    className="w-full p-4 border-2 border-sky-100 rounded-2xl focus:ring-2 focus:ring-sky-400 focus:border-sky-300 outline-none font-medium text-gray-900 bg-sky-50/30 transition-all" 
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-sky-700 ml-1 mb-1 block">비밀번호</label>
                  <input 
                    type="password" 
                    placeholder="비밀번호를 입력하세요 (최대 20자)" 
                    value={password} 
                    maxLength={20} // 🌟 글자수 제한 추가
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-4 border-2 border-sky-100 rounded-2xl focus:ring-2 focus:ring-sky-400 focus:border-sky-300 outline-none font-medium text-gray-900 bg-sky-50/30 transition-all" 
                  />
                </div>
                <button 
                  onClick={handleLogin} 
                  className="bg-gradient-to-r from-sky-500 to-blue-600 text-white py-4 rounded-2xl font-black text-lg hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-md shadow-sky-300/40 mt-2"
                >
                  로그인하기 →
                </button>
                <div className="flex justify-center gap-4 mt-3 text-sm text-gray-500 font-medium">
                  <button onClick={() => setActiveTab("signup")} className="hover:text-sky-600 transition-colors">회원가입</button>
                  <span className="text-gray-300">|</span>
                  <button className="hover:text-sky-600 transition-colors">비밀번호 찾기</button>
                </div>
              </div>
            </>
          ) : (
            /* 🟢 로그인 후: 내 정보 (마이페이지) 화면 */
            <div className="w-full flex flex-col gap-5">
              
              {/* 🌟 프로필 카드 (게임 카드 느낌) */}
              <div className="bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 p-6 rounded-3xl shadow-xl shadow-blue-400/40 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 text-8xl opacity-20">🛡️</div>
                <div className="absolute -left-2 -bottom-2 text-6xl opacity-15">✨</div>
                
                <div className="relative z-10 flex items-center gap-4 mb-5">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-4xl shadow-lg border-4 border-white/50">
                    👤
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white drop-shadow-sm">{user.loginId}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="bg-white/25 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                        🏆 도시 수호자 LV.1
                      </span>
                    </div>
                  </div>
                </div>

                {/* 🌟 포인트 및 서울페이 전환 섹션 */}
                <div className="bg-white/95 backdrop-blur-sm p-5 rounded-2xl flex justify-between items-center shadow-inner relative z-10">
                  <div>
                    <p className="text-xs text-sky-600 font-black mb-1 tracking-wide">💰 보유 포인트</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-3xl font-black text-blue-900">
                        {user.points.toLocaleString()} <span className="text-lg font-bold text-sky-500">P</span>
                      </h4>
                      {/* 서울페이 전환 버튼 */}
                      <button 
                        onClick={() => alert("서울페이 전환 연동 기능은 현재 준비 중입니다! 💸")}
                        className="bg-gradient-to-r from-sky-500 to-blue-500 text-white px-3 py-1.5 rounded-xl text-xs font-black hover:shadow-md hover:-translate-y-0.5 transition-all shadow-sm flex items-center gap-1"
                      >
                        <span>💳</span> 서울페이 전환
                      </button>
                    </div>
                  </div>
                  <div className="text-5xl animate-bounce">🪙</div>
                </div>
              </div>

              {/* 🌟 (수정됨) 통계 섹션 축소 & 내 신고 기록 리스트 추가 */}
              <div className="bg-white p-5 rounded-3xl shadow-md border border-sky-100">
                <h3 className="text-base font-black text-gray-800 mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-gradient-to-br from-sky-100 to-cyan-100 rounded-full flex items-center justify-center text-base">📝</span>
                  나의 신고 기록 리스트
                </h3>
                
                {/* 나의 신고 기록 리스트 부분 */}
                {reports.length === 0 ? (
                  <div className="text-center py-10 bg-sky-50/50 rounded-2xl border-2 border-dashed border-sky-100">
                    <div className="text-4xl mb-2">📭</div>
                    <p className="text-sky-700 font-bold text-sm">아직 등록된 신고 기록이 없습니다</p>
                    <p className="text-sky-400 text-xs mt-1">첫 신고를 해보세요! 🚀</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {reports.map((report) => (
                      <div key={report.id} className="border-2 border-sky-50 rounded-2xl p-3 flex gap-3 bg-gradient-to-br from-sky-50/50 to-white hover:shadow-md transition-shadow">
                        {report.imageUrl && (
                          <img 
                            src={report.imageUrl} 
                            alt="신고 사진" 
                            className="w-20 h-20 object-cover rounded-2xl bg-gray-200 shadow-sm"
                            onError={(e) => (e.currentTarget.style.display = "none")}
                          />
                        )}
                        
                        <div className="flex-1 flex flex-col justify-between">
                          {/* 🌟 editingId가 현재 report.id와 같으면 '수정 모드' 렌더링 */}
                          {editingId === report.id ? (
                            <div className="w-full">
                              <textarea
                                className="w-full border-2 border-sky-300 rounded-xl p-2 text-sm h-16 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white text-gray-900 resize-none placeholder-gray-400"
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                maxLength={100}
                                placeholder="수정할 내용을 입력하세요"
                              />
                              <div className="flex justify-end gap-1 mt-1">
                                <span className="text-[10px] text-gray-400 mr-auto pt-1">{editDescription.length}/100</span>
                                <button 
                                  onClick={() => handleEditReport(report.id)} 
                                  className="text-[10px] bg-gradient-to-r from-sky-500 to-blue-500 text-white px-3 py-1 rounded-lg hover:shadow-md font-black shadow-sm"
                                >
                                  저장
                                </button>
                                <button 
                                  onClick={() => setEditingId(null)} 
                                  className="text-[10px] bg-gray-200 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-300 font-black shadow-sm"
                                >
                                  취소
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* 🌟 평상시 '일반 모드' 렌더링 */
                            <div>
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-[10px] text-white bg-gradient-to-r from-sky-400 to-blue-500 px-2 py-0.5 rounded-full font-black shadow-sm">No. {report.id}</span>
                                <div className="flex gap-1">
                                  {/* 수정 버튼 누르면 수정 모드로 전환! */}
                                  <button 
                                    onClick={() => {
                                      setEditingId(report.id);
                                      setEditDescription(report.description || "");
                                    }} 
                                    className="text-[10px] bg-white border border-sky-200 px-2 py-1 rounded-lg hover:bg-sky-50 text-sky-700 shadow-sm font-bold"
                                  >
                                    수정
                                  </button>
                                  <button onClick={() => handleDeleteReport(report.id)} className="text-[10px] bg-rose-50 border border-rose-200 px-2 py-1 rounded-lg hover:bg-rose-100 text-rose-600 shadow-sm font-bold">
                                    삭제
                                  </button>
                                </div>
                              </div>
                              <p className="text-sm text-gray-700 line-clamp-2 mt-1 font-medium">
                                {report.description || <span className="text-gray-400 italic">설명 없음</span>}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 로그아웃 버튼 */}
              <button 
                onClick={() => {
                  setUser(null); 
                  alert("로그아웃 되었습니다.");
                }}
                className="mt-2 mb-2 text-gray-400 text-sm font-bold hover:text-rose-500 transition-colors py-2"
              >
                로그아웃
              </button>
            </div>
          )}

        </div>
      )}

      {/* 🌟 activeTab이 'signup'일 때 보여줄 회원가입 화면 */}
      {activeTab === "signup" && (
        <div className="w-full max-w-lg flex flex-col items-center p-5 mt-2 relative z-10">
          
          {/* 🌟 마스코트 헤더 카드 */}
          <div className="w-full bg-gradient-to-br from-emerald-400 via-green-500 to-teal-500 rounded-3xl p-6 mb-6 shadow-xl shadow-emerald-300/40 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-white/25 backdrop-blur-sm text-white text-[10px] font-bold px-3 py-1 rounded-full">
                  JOIN US
                </span>
              </div>
              <h2 className="text-2xl font-black text-white drop-shadow-sm">
                회원가입
              </h2>
              <p className="text-white/90 text-sm mt-1 font-medium">
                도시 수호자가 되어주세요! 🌱
              </p>
            </div>
            <div className="absolute -right-2 -bottom-3 text-7xl opacity-30">🌟</div>
            <div className="absolute right-20 top-2 text-2xl opacity-25">✨</div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-md w-full flex flex-col gap-3 border border-emerald-100">
            
            {/* 🌟 수정된 부분: 아이디 입력칸과 중복확인 버튼을 가로로 배치 */}
            <div>
              <label className="text-xs font-black text-emerald-700 ml-1 mb-1 block">아이디</label>
              <div className="flex gap-2 w-full">
                <input 
                  type="text" 
                  placeholder="사용할 아이디 (4~20자)" 
                  value={signupId}
                  maxLength={20} // 글자수 제한
                  onChange={(e) => {
                    setSignupId(e.target.value);
                    setIsIdChecked(false); // 아이디를 수정하면 중복확인을 다시 하도록 초기화
                  }}
                  className="w-full p-4 border-2 border-emerald-100 rounded-2xl focus:ring-2 focus:ring-emerald-400 focus:border-emerald-300 outline-none font-medium text-gray-900 bg-emerald-50/30 transition-all" 
                />
                <button 
                  onClick={handleCheckDuplicateId} // 앞서 만든 중복확인 함수 연결
                  className={`px-4 rounded-2xl font-black text-white transition-all whitespace-nowrap shadow-md ${isIdChecked ? 'bg-gray-400 shadow-gray-200' : 'bg-gradient-to-br from-emerald-500 to-green-600 hover:-translate-y-0.5 hover:shadow-lg shadow-emerald-300/40'}`}
                  disabled={isIdChecked}
                >
                  {isIdChecked ? "✓ 완료" : "중복확인"}
                </button>
              </div>
            </div>

            {/* 🌟 수정된 부분: 비밀번호 글자수 제한 및 플레이스홀더 변경 */}
            <div>
              <label className="text-xs font-black text-emerald-700 ml-1 mb-1 block">비밀번호</label>
              <input 
                type="password" 
                placeholder="영문, 특수문자 포함 8~20자" 
                value={signupPassword}
                maxLength={20} // 글자수 제한
                onChange={(e) => setSignupPassword(e.target.value)}
                className="w-full p-4 border-2 border-emerald-100 rounded-2xl focus:ring-2 focus:ring-emerald-400 focus:border-emerald-300 outline-none font-medium text-gray-900 bg-emerald-50/30 transition-all" 
              />
            </div>
            
            <button 
              onClick={handleSignup}
              className="bg-gradient-to-r from-emerald-500 to-green-600 text-white py-4 rounded-2xl font-black text-lg hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-md shadow-emerald-300/40 mt-3"
            >
              가입 완료하기 🌱
            </button>
            
            {/* 다시 로그인 화면으로 돌아가는 버튼 */}
            <button 
              onClick={() => setActiveTab("login")}
              className="text-gray-500 hover:text-emerald-700 mt-1 font-bold text-sm transition-colors py-1"
            >
              ← 취소하고 로그인으로 돌아가기
            </button>
          </div>
        </div>
      )}

      {/* 하단 네비게이션 탭 (3개로 확장) */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white/90 backdrop-blur-xl border-t border-sky-100 flex justify-around p-2 shadow-[0_-4px_20px_rgba(14,165,233,0.08)] z-50 rounded-t-3xl">
        <button onClick={() => setActiveTab("weather")} className={`flex flex-col items-center p-2 w-full rounded-2xl transition-all ${activeTab === "weather" ? "text-white bg-gradient-to-br from-sky-400 to-cyan-500 shadow-md shadow-sky-300/40 scale-105" : "text-gray-400 hover:text-sky-600"}`}>
          <span className="text-2xl mb-0.5">🌧️</span>
          <span className="text-[11px] font-black">강우량</span>
        </button>
        <button onClick={() => setActiveTab("home")} className={`flex flex-col items-center p-2 w-full rounded-2xl transition-all ${activeTab === "home" ? "text-white bg-gradient-to-br from-rose-400 to-pink-500 shadow-md shadow-rose-300/40 scale-105" : "text-gray-400 hover:text-rose-600"}`}>
          <span className="text-2xl mb-0.5">🗺️</span>
          <span className="text-[11px] font-black">지도/신고</span>
        </button>
        <button onClick={() => setActiveTab("login")} className={`flex flex-col items-center p-2 w-full rounded-2xl transition-all ${activeTab === "login" ? "text-white bg-gradient-to-br from-blue-400 to-indigo-500 shadow-md shadow-blue-300/40 scale-105" : "text-gray-400 hover:text-blue-600"}`}>
          <span className="text-2xl mb-0.5">👤</span>
          <span className="text-[11px] font-black">내 정보</span>
        </button>
      </nav>
      {/* 🌟 신고 전 주의사항 모달 */}
{showWarningModal && (
  <div 
    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in"
    onClick={() => setShowWarningModal(false)}
  >
    <div 
      className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 헤더 */}
      <div className="bg-gradient-to-br from-rose-400 via-orange-400 to-amber-400 text-white p-6 rounded-t-3xl relative overflow-hidden">
        <div className="absolute -right-2 -bottom-2 text-7xl opacity-25">⚠️</div>
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-14 h-14 bg-white/25 backdrop-blur-sm rounded-2xl flex items-center justify-center text-3xl shadow-inner">
            ⚠️
          </div>
          <div>
            <h3 className="text-xl font-black drop-shadow-sm">잠깐! 확인해주세요</h3>
            <p className="text-xs text-white/90 mt-0.5 font-medium">신고 전 꼭 읽어주세요</p>
          </div>
        </div>
      </div>

      {/* 내용 */}
      <div className="p-6 flex flex-col gap-3">
        
        <div className="flex gap-3 items-start bg-rose-50 p-4 rounded-2xl border-2 border-rose-100">
          <span className="text-3xl">🚫</span>
          <div>
            <h4 className="font-black text-gray-800 text-sm mb-1">허위 신고 금지</h4>
            <p className="text-xs text-gray-600 leading-relaxed font-medium">
              포인트 획득을 위한 거짓 신고 시 계정이 영구 정지되며, 적립된 포인트가 회수됩니다.
            </p>
          </div>
        </div>

        <div className="flex gap-3 items-start bg-amber-50 p-4 rounded-2xl border-2 border-amber-100">
          <span className="text-3xl">📷</span>
          <div>
            <h4 className="font-black text-gray-800 text-sm mb-1">개인정보 노출 주의</h4>
            <p className="text-xs text-gray-600 leading-relaxed font-medium">
              사진에 행인의 얼굴, 차량 번호판, 집 주소 등이 찍히지 않도록 주의해주세요.
            </p>
          </div>
        </div>

        <div className="flex gap-3 items-start bg-sky-50 p-4 rounded-2xl border-2 border-sky-100">
          <span className="text-3xl">📍</span>
          <div>
            <h4 className="font-black text-gray-800 text-sm mb-1">위치 정보 수집 동의</h4>
            <p className="text-xs text-gray-600 leading-relaxed font-medium">
              정확한 신고 처리를 위해 현재 GPS 위치가 함께 전송되며, 지도에 공개됩니다.
            </p>
          </div>
        </div>

        <div className="flex gap-3 items-start bg-emerald-50 p-4 rounded-2xl border-2 border-emerald-100">
          <span className="text-3xl">⚡</span>
          <div>
            <h4 className="font-black text-gray-800 text-sm mb-1">안전 우선!</h4>
            <p className="text-xs text-gray-600 leading-relaxed font-medium">
              폭우 시 무리한 촬영은 위험합니다. 본인의 안전을 최우선으로 해주세요.
            </p>
          </div>
        </div>

        <p className="text-[11px] text-gray-400 text-center mt-2 leading-relaxed font-medium">
          신고된 내용은 관할 구청에 전달될 수 있으며,<br/>
          서울시 시민제보 운영 정책을 따릅니다.
        </p>
      </div>

      {/* 버튼 영역 */}
      <div className="flex gap-2 p-4 border-t border-gray-100 bg-gray-50 rounded-b-3xl">
        <button
          onClick={() => setShowWarningModal(false)}
          className="flex-1 bg-white border-2 border-gray-200 text-gray-700 py-3.5 rounded-2xl font-black hover:bg-gray-100 transition-colors"
        >
          취소
        </button>
        <button
          onClick={() => {
            setShowWarningModal(false);
            handleSubmit();
          }}
          className="flex-[2] bg-gradient-to-r from-rose-500 to-red-500 text-white py-3.5 rounded-2xl font-black hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-md shadow-rose-300/40"
        >
          ✅ 동의하고 신고하기
        </button>
      </div>
    </div>
  </div>
)}
      
    </main>
  );
}