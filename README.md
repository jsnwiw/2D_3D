# 📊 3D & 2D 인터랙티브 데이터 분석 및 시각화 시스템
> **⚡ Vulkan & WebGPU 차세대 GPU 가속 파이프라인 탑재**

사용자가 업로드한 CSV 데이터의 유형(수치형, 범주형, 시계열 등)을 자동으로 분석하여 최적의 3D 공간 시각화 및 2D 대시보드로 즉시 렌더링하는 고성능 반응형 웹 애플리케이션입니다.

---

## ⚡ 차세대 GPU 그래픽스 아키텍처 (Vulkan / WebGPU)

- **Vulkan / Direct3D 12 저수준 하드웨어 파이프라인**: 
  - 브라우저 표준 차세대 저수준 그래픽스 API인 **WebGPU** 및 **Three.js WebGPURenderer**를 기반으로 전면 리빌드되었습니다.
  - Windows 시스템에서 **Vulkan / Direct3D 12** 백엔드와 직접 통신하여 기존 WebGL 대비 드라이버 오버헤드를 획기적으로 낮추고 CPU-GPU 병목을 해소합니다.
  - **WGSL (WebGPU Shading Language)** 네이티브 셰이더 파이프라인을 통해 수만 개의 3D 데이터 객체도 60~120 FPS로 안정적으로 렌더링합니다.
- **실시간 GPU 하드웨어 모니터링 HUD**:
  - 상단 바의 `⚡ Vulkan / WebGPU` 뱃지를 클릭하면 현재 구동 중인 GPU 어댑터 명칭, 제조사, 아키텍처 및 실시간 FPS / 프레임 타임(ms)을 바로 확인할 수 있습니다.
- **무중단 스마트 자동 폴백 (Graceful Fallback)**:
  - 구형 브라우저이거나 WebGPU가 비활성화된 환경에서는 자동으로 고안정성 **WebGL 2.0 세이프 모드**로 전환되어 호환성 문제를 원천 차단합니다.

---

## 🚀 주요 기능

1. **지능형 데이터 분석 엔진**
   - CSV 파일 업로드 시 각 열의 데이터 타입(숫자, 날짜, 문자) 자동 판별
   - 기술 통계량(평균, 최대, 최소, 표준편차, 합계) 자동 계산 및 통계 카드 제공
   - 데이터 특성에 맞춘 최적의 시각화 형태(3D/2D) 자동 추천

2. **다양한 3D 시각화 스타일**
   - 📈 **3D 입체 튜브 라인 (line)**: 시계열 추세 분석 특화
   - 🥧 **3D 파이 슬라이스 (pie)**: 8개 이하 카테고리 비율 및 점유율
   - 🌐 **3D 입체 산점도 (scatter)**: 다변량 수치 간 공간적 상관관계 분석
   - 🌊 **3D 곡면 서피스 (surface)**: 대량 데이터 지형화 분포 분석
   - 📊 **3D 원기둥 / 직육면체 막대 (cylinder / box)**: 범주별 크기 비교

3. **정밀한 3D ↔ 2D 실시간 인터랙션**
   - **레이캐스팅(Raycasting)**: 마우스/터치 호버 시 1.08배 스케일 확대 및 발광(Emissive) 피드백
   - **좌표 투영 동기화**: `Vector3.project(camera)` 기반 3D 월드 좌표와 2D 화면 DOM 픽셀 동기화 (플로팅 툴팁 & 바닥 라벨 실시간 추적)
   - **양방향 연동**: 3D 개체 클릭 시 카메라 부드러운 줌인 및 2D 데이터 테이블·상세 통계 카드·미니 차트 즉각 하이라이트

4. **사용자 제어 및 대시보드**
   - X축(라벨), Y축(값) 축 동적 선택
   - 특정 카테고리 필터링 및 수치형 범위(Min~Max) 필터링, 정렬 기능
   - 8종의 2D Chart.js 연동 차트 동시 표출

---

## 🛠 기술 스택
- **Graphics Pipeline**: Three.js (r160) **WebGPURenderer** (Vulkan / Direct3D 12 Backends), WebGL 2.0 Fallback
- **Interaction Controls**: OrbitControls, Raycaster Screen Projection
- **2D Charts**: Chart.js (v4.4.1)
- **Frontend**: Vanilla JavaScript (ES Module & Top-level Await), HTML5, CSS3 (Glassmorphism & Responsive)
- **Deployment**: GitHub Pages / 로컬 브라우저 즉시 구동 (무설치 PWA 지원)
