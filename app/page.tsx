"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { Map, MapMarker } from "react-kakao-maps-sdk"; // 🌟 지도 라이브러리 가져오기

// 🌟 서버에서 받아올 데이터(신고 내역)의 모양표
interface Report {
  id: number;
  latitude: number;
  longitude: number;
  imageUrl: string;
}

export default function Home() {
  // 처음 지도 중심을 서울시청(37.5665, 126.9780)으로 잡기 위해 기본값 수정
  const [location, setLocation] = useState({ lat: 37.5665, lng: 126.9780 }); 
  const [status, setStatus] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [reports, setReports] = useState<Report[]>([]); // 🌟 서버에서 가져온 신고 목록 저장소

  // 🌟 [추가됨] 서버에서 기존 신고 내역들을 싹 다 가져오는 함수
  const fetchReports = async () => {
    try {
      const response = await fetch("http://localhost:8080/api/reports");
      if (response.ok) {
        const data = await response.json();
        setReports(data); // 가져온 데이터를 reports 저장소에 넣음
      }
    } catch (error) {
      console.error("데이터 불러오기 실패:", error);
    }
  };

  useEffect(() => {
    // 🌟 위에서 완벽하게 만들어둔 함수를 여기서 부르기만 하면 됩니다!
    fetchReports();
  }, []);

  // 사진 찍기 & 내 위치 찾기 (기존과 동일)
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setImagePreview(URL.createObjectURL(file));
      
      setStatus("사진 확인됨. 현재 위치를 매칭하는 중...");
      
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
            setStatus("위치 매칭 완료! 이제 신고를 접수하세요. ✅");
          },
          (error) => {
            setStatus("사진은 찍었지만 위치를 가져오지 못했습니다. (GPS를 켜주세요)");
          },
          { enableHighAccuracy: true }
        );
      }
    }
  };

  // 서버로 데이터 전송 (기존과 거의 동일, 성공 시 화면 갱신 추가)
  const handleSubmit = async () => {
    if (!uploadFile || location.lat === 0) {
      alert("사진과 위치 정보가 필요합니다!");
      return;
    }

    const formData = new FormData();
    formData.append("latitude", location.lat.toString());
    formData.append("longitude", location.lng.toString());
    formData.append("image", uploadFile);

    try {
      setStatus("사진 업로드 중...");
      const response = await fetch("http://localhost:8080/api/reports", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        setStatus("✅ 사진 신고 성공!");
        alert("성공적으로 접수되었습니다!");
        
        // 🌟 성공하면 화면 초기화하고 지도를 새로고침!
        setImagePreview("");
        setUploadFile(null);
        fetchReports(); // 방금 신고한 걸 지도에 바로 띄우기 위해 데이터를 다시 가져옴
      }
    } catch (error) {
      setStatus("❌ 전송 실패");
    }
  };

  return (
    <main className="flex flex-col items-center min-h-screen bg-blue-50 p-4">
      <h1 className="text-2xl font-bold mb-4 text-blue-800 text-center mt-4">
        🚨 침수 방지 하수구 실시간 지도
      </h1>

      {/* 🗺️ [추가됨] 카카오 지도 화면 */}
      <div className="w-full max-w-lg h-[350px] rounded-xl overflow-hidden shadow-lg mb-6 border-4 border-white">
        <Map 
          center={{ lat: location.lat, lng: location.lng }} // 내 위치를 중심으로 보여줌
          style={{ width: "100%", height: "100%" }}
          level={3} // 확대 수준
        >
          {/* 내 현재 위치 마커 (파란색으로 띄우기 위해 별도 설정 안 함) */}
          {location.lat !== 37.5665 && (
            <MapMarker position={{ lat: location.lat, lng: location.lng }}>
              <div className="p-1 text-xs text-blue-600 font-bold">내 위치</div>
            </MapMarker>
          )}

          {/* 🌟 서버에서 가져온 신고 데이터들을 마커로 찍어주기 */}
          {reports.map((report) => (
            <MapMarker
              key={report.id}
              position={{ lat: report.latitude, lng: report.longitude }}
              image={{
                src: "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png", // 카카오 기본 별 모양 마커
                size: { width: 24, height: 35 },
              }}
            >
              <div className="p-1 text-xs text-red-500 font-bold">신고됨!</div>
            </MapMarker>
          ))}
        </Map>
      </div>

      {/* 사진 신고 영역 (기존과 동일) */}
      <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-lg flex flex-col gap-4">
        <label className="bg-green-500 text-white py-4 rounded-lg hover:bg-green-600 font-bold text-center cursor-pointer transition-all shadow-lg block w-full text-lg">
          📸 하수구 사진 찍기
          <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
        </label>

        <div className="text-sm text-gray-600 text-center bg-gray-50 p-3 rounded-lg border border-gray-100">
          <p className="font-bold text-blue-600 mb-1">{status || "위의 버튼을 눌러 사진을 찍어주세요"}</p>
        </div>

        {imagePreview && (
          <div className="mt-2 flex flex-col items-center">
            <img src={imagePreview} alt="미리보기" className="w-full h-auto max-h-60 object-contain rounded-lg shadow-sm border bg-gray-100" />
          </div>
        )}

        {imagePreview && (
          <button 
            onClick={handleSubmit}
            className="bg-red-500 text-white py-3 rounded-lg hover:bg-red-600 font-bold transition-colors w-full text-lg shadow-md mt-2 animate-bounce"
          >
            🚨 이곳을 신고하기
          </button>
        )}
      </div>
    </main>
  );
}