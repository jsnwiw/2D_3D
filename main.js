/**
 * ==============================================================================
 * [main.js] 3D & 2D 인터랙티브 데이터 시각화 웹 플랫폼 메인 스크립트
 * ==============================================================================
 * 
 * [시스템 개요]
 * - WebGPU (Vulkan / Direct3D 12) 및 WebGL 2.0 하드웨어 가속 기반 실시간 3D 렌더링
 * - 엑셀(.xlsx, .xls) 및 CSV 무변환 고속 파싱 (SheetJS & TextDecoder 바이너리 스니퍼)
 * - 한국어 ANSI(EUC-KR / CP949) 및 표준 UTF-8 자동 감지 엔진 탑재
 * - 1.5 × IQR(사분위수 범위) 기반 AI 통계 분석 및 이상치(Outlier) 자동 브리핑
 * - 시계열 타임슬라이더 플레이어 (0~100세, 연도별 타임랩스 애니메이션)
 * - 10종 3D 지오메트리 & 8종 2D Chart.js 양방향 레이캐스팅 동기화
 * - 스튜디오급 정밀 3D 조명/환경 제어 및 A4 분석 보고서 인쇄 시스템
 * 
 * [아키텍처 목차 (Architecture Index)]
 * 1. 차세대 그래픽스 엔진 (Vulkan / WebGPU) & Three.js 씬 초기화
 * 2. 전역 상태 관리 (Global States)
 * 3. DOM 엘리먼트 참조 캐싱
 * 4. 카메라 제어 (부드러운 시점 보간 애니메이션 & 앵글 프리셋)
 * 5. 대시보드 메뉴 & 아코디언 인터페이스
 * 6. 메뉴 패널 스크롤 엔진 (마우스 휠 + 모바일 터치 제스처 + 키보드)
 * 7. 3D 환경 및 조명 실시간 제어 (Ambient, Sunlight, Exposure, Fog, Shadow)
 * 8. CSV/엑셀 파싱 및 다중 인코딩 디코더 (UTF-8, EUC-KR 자동 감지)
 * 9. 스마트 통계 분석 및 AI 이상치 탐지 엔진
 * 10. 지능형 추천 시각화 자동 적용 엔진
 * 11. 인터랙티브 데이터 테이블 렌더링 & 양방향 선택 연동
 * 12. 10종 3D 지오메트리 스타일 렌더러 (Cylinder, Pie, Tube, Scatter, Surface 등)
 * 13. 3D 월드 좌표 ↔ 2D 화면 DOM 투영 동기화 (Vector3.project)
 * 14. 3D 레이캐스팅 광선 추적 (Hover 발광 & Click 카메라 포커싱)
 * 15. 선택 항목 상세 카드 & 비교 미니 차트 표출
 * 16. Chart.js 2D 보조 차트 렌더러 & 다축 데이터 필터링/정렬 엔진
 * 17. 이벤트 리스너, 파일 로더, 타임라인 플레이어 & A4 보고서 출력
 * 18. 차세대 렌더 루프 및 실시간 60FPS 성능 모니터링
 * ==============================================================================
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import WebGPURenderer from 'three/addons/renderers/webgpu/WebGPURenderer.js';

// ════════════════════════════════════════════════════════════
// 1. 차세대 그래픽스 엔진 (Vulkan / WebGPU) & Three.js 씬 초기화
// ════════════════════════════════════════════════════════════
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf1f5f9);
scene.fog = new THREE.FogExp2(0xf1f5f9, 0.015);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 10, 20);

// GPU 하드웨어 정보 및 엔진 상태
export const gpuEngineState = {
    isWebGPU: false,
    backendName: 'WebGL 2.0 (폴백 모드)',
    gpuName: '시스템 그래픽스 가속기',
    vendor: '감지 중...',
    architecture: 'Standard Pipeline',
    featuresCount: 0,
    fps: 60,
    frameTimeMs: 16.6
};

// WebGPU (Vulkan / Direct3D 12 Low-level) 감지 및 비동기 초기화
let renderer;

if ('gpu' in navigator) {
    try {
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter) {
            renderer = new WebGPURenderer({ antialias: true, alpha: false });
            await renderer.init();
            gpuEngineState.isWebGPU = true;
            gpuEngineState.backendName = 'WebGPU (Vulkan / Direct3D 12 Low-level)';

            const info = await adapter.requestAdapterInfo?.();
            if (info) {
                gpuEngineState.gpuName = info.device || info.description || 'Vulkan 가속 하드웨어 GPU';
                gpuEngineState.vendor = info.vendor || 'Hardware GPU Vendor';
                gpuEngineState.architecture = info.architecture || 'WGSL Low-level Pipeline';
            } else {
                gpuEngineState.gpuName = 'Vulkan 가속 차세대 GPU';
                gpuEngineState.vendor = 'Native Hardware';
                gpuEngineState.architecture = 'WebGPU Low-level Shaders';
            }
            gpuEngineState.featuresCount = adapter.features?.size || 0;
            console.log('⚡ Vulkan / WebGPU 엔진 초기화 완료:', gpuEngineState);
        }
    } catch (e) {
        console.warn('WebGPU 초기화 실패, WebGL2로 자동 폴백합니다:', e);
    }
}

if (!renderer) {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    gpuEngineState.isWebGPU = false;
    gpuEngineState.backendName = 'WebGL 2.0 (호환성 세이프 모드)';
    gpuEngineState.gpuName = '시스템 기본 그래픽 가속 장치';
    gpuEngineState.architecture = 'GLSL ES 3.0 Pipeline';
    console.log('🌐 WebGL 2.0 세이프 모드로 시작되었습니다.');
}

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
container.appendChild(renderer.domElement);

// ── OrbitControls ──
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 3;
controls.maxDistance = 80;
controls.maxPolarAngle = Math.PI * 0.85;
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
controls.target.set(0, 2, 0);

// ── 조명 (라이트 모드에 최적화된 밝은 환경) ──
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
dirLight.position.set(12, 20, 10);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 60;
dirLight.shadow.camera.left = -20;
dirLight.shadow.camera.right = 20;
dirLight.shadow.camera.top = 20;
dirLight.shadow.camera.bottom = -20;
dirLight.shadow.bias = -0.00005;
dirLight.shadow.normalBias = 0.02;
scene.add(dirLight);

const pointLight = new THREE.PointLight(0x818cf8, 0.8, 50);
pointLight.position.set(-8, 12, -5);
scene.add(pointLight);

// ── 바닥 및 그리드 (부드러운 슬레이트 그레이) ──
const gridHelper = new THREE.GridHelper(40, 40, 0xcbd5e1, 0xe2e8f0);
scene.add(gridHelper);

const floorGeo = new THREE.PlaneGeometry(40, 40);
const floorMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc, roughness: 0.9, metalness: 0.1
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.01;
floor.receiveShadow = true;
scene.add(floor);

// ════════════════════════════════════════════════════════════
// 2. 전역 상태
// ════════════════════════════════════════════════════════════
let parsedData = null;
let analysisResult = null;
let chart2d = null;
let miniChart = null;
let dataObjects = [];
let extraVisuals = [];
let domLabels = [];
let showLabels = true;
let selectedObject = null;
let hoveredObject = null;
let cameraAnim = null;

// ════════════════════════════════════════════════════════════
// 3. DOM 참조
// ════════════════════════════════════════════════════════════
const $ = id => document.getElementById(id);
const csvUpload = $('csv-upload');
const csvEncodingSelect = $('csv-encoding-select');
let currentUploadedFile = null;
const fileNameDisplay = $('file-name');
const statusIndicator = $('status-indicator');
const detailSection = $('detail-card-section');
const detailName = $('detail-name');
const detailStats = $('detail-stats');
const analysisSection = $('analysis-section');
const analysisResultEl = $('analysis-result');
const vizSection = $('viz-section');
const chartTypeSelect = $('chart-type-select');
const xAxisSelect = $('x-axis-select');
const yAxisSelect = $('y-axis-select');
const applyBtn = $('apply-btn');
const filterSection = $('filter-section');
const dataFilter = $('data-filter');
const rangeMin = $('range-min');
const rangeMax = $('range-max');
const btnApplyRange = $('btn-apply-range');
const sortSelect = $('sort-select');
const chartPanel = $('chart-panel');
const chartTitle = $('chart-title');
const chartCloseBtn = $('chart-close-btn');
const chartMaxBtn = $('chart-maximize-btn');
const hoverTooltip = $('hover-tooltip');
const tooltipName = $('tooltip-name');
const tooltipValue = $('tooltip-value');
const labelLayer = $('label-layer');
const barStyleSelect = $('bar-style');
const menuPanel = $('menu-panel');
const btnToggleMenu = $('btn-toggle-menu');
const btnCloseMenu = $('btn-close-menu');
const autoRecommendToggle = $('auto-recommend-toggle');
const autoRecommendStatusBadge = $('auto-recommend-status-badge');
const appliedRecommendNotice = $('applied-recommend-notice');
const btnForceRecommend = $('btn-force-recommend');
const colorThemeSelect = $('color-theme-select');
const customColorGroup = $('custom-color-group');
const customColorPicker = $('custom-theme-color-picker');
const customColorCode = $('custom-theme-color-code');
const filterKeyword = $('filter-keyword');
const limitSelect = $('limit-select');
const filterSummaryBadge = $('filter-summary-badge');
const btnFilterTop10 = $('btn-filter-top10');
const btnFilterAboveAvg = $('btn-filter-above-avg');
const btnFilterTop20pct = $('btn-filter-top20pct');
const btnFilterAll = $('btn-filter-all');

// GPU 뱃지 및 모달 DOM 참조
const gpuEngineBadge = $('gpu-engine-badge');
const gpuEngineText = $('gpu-engine-text');
const gpuInfoModal = $('gpu-info-modal');
const btnCloseGpuModal = $('btn-close-gpu-modal');
const modalGpuApi = $('modal-gpu-api');
const modalGpuDevice = $('modal-gpu-device');
const modalGpuVendor = $('modal-gpu-vendor');
const modalGpuArchitecture = $('modal-gpu-architecture');
const modalGpuFeatures = $('modal-gpu-features');
const modalGpuFps = $('modal-gpu-fps');

// 타임라인 플레이어 & 토스트 DOM 참조
const btnToggleTimeline = $('btn-toggle-timeline');
const timePlayerBar = $('time-player-bar');
const btnTimePlay = $('btn-time-play');
const btnTimePrev = $('btn-time-prev');
const btnTimeNext = $('btn-time-next');
const timeSliderRange = $('time-slider-range');
const timeSpeedSelect = $('time-speed-select');
const timeStepBadge = $('time-step-badge');
const timeColName = $('time-col-name');
const btnCloseTimePlayer = $('btn-close-time-player');
const toastNotification = $('toast-notification');

function showToast(message, duration = 3200) {
    if (!toastNotification) return;
    toastNotification.innerHTML = message;
    toastNotification.style.display = 'flex';
    clearTimeout(toastNotification._timer);
    toastNotification._timer = setTimeout(() => {
        toastNotification.style.display = 'none';
    }, duration);
}

// GPU 엔진 뱃지 UI 갱신 함수
function updateGpuBadgeUI() {
    if (!gpuEngineBadge || !gpuEngineText) return;
    if (gpuEngineState.isWebGPU) {
        gpuEngineBadge.className = 'gpu-badge';
        gpuEngineText.textContent = '⚡ Vulkan / WebGPU';
        gpuEngineBadge.title = `차세대 WebGPU(Vulkan Low-level 백엔드) 활성화: ${gpuEngineState.gpuName}`;
    } else {
        gpuEngineBadge.className = 'gpu-badge fallback';
        gpuEngineText.textContent = '🌐 WebGL 2.0 (호환)';
        gpuEngineBadge.title = 'WebGL 2.0 세이프 모드로 실행 중 (WebGPU 미지원 환경)';
    }
}
updateGpuBadgeUI();

// GPU 모달 창 열기/닫기 이벤트
if (gpuEngineBadge) {
    gpuEngineBadge.addEventListener('click', () => {
        if (!gpuInfoModal) return;
        if (modalGpuApi) modalGpuApi.textContent = gpuEngineState.backendName;
        if (modalGpuDevice) modalGpuDevice.textContent = gpuEngineState.gpuName;
        if (modalGpuVendor) modalGpuVendor.textContent = gpuEngineState.vendor;
        if (modalGpuArchitecture) modalGpuArchitecture.textContent = gpuEngineState.architecture;
        if (modalGpuFeatures) modalGpuFeatures.textContent = `${gpuEngineState.featuresCount}개 하드웨어 기능 활성화됨`;
        if (modalGpuFps) modalGpuFps.textContent = `${gpuEngineState.fps} FPS (${gpuEngineState.frameTimeMs} ms)`;
        gpuInfoModal.style.display = 'flex';
    });
}
if (btnCloseGpuModal) {
    btnCloseGpuModal.addEventListener('click', () => {
        if (gpuInfoModal) gpuInfoModal.style.display = 'none';
    });
}
if (gpuInfoModal) {
    gpuInfoModal.addEventListener('click', e => {
        if (e.target === gpuInfoModal) gpuInfoModal.style.display = 'none';
    });
}

// ════════════════════════════════════════════════════════════
// 4. 카메라 제어 (부드러운 전환 & 프리셋 뷰)
// ════════════════════════════════════════════════════════════
function animateCamera(targetPos, targetLookAt, duration = 800) {
    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    const endPos = new THREE.Vector3(...targetPos);
    const endTarget = new THREE.Vector3(...targetLookAt);
    const startTime = performance.now();
    cameraAnim = { startPos, startTarget, endPos, endTarget, startTime, duration };
}

function updateCameraAnim() {
    if (!cameraAnim) return;
    const { startPos, startTarget, endPos, endTarget, startTime, duration } = cameraAnim;
    const elapsed = performance.now() - startTime;
    const t = Math.min(elapsed / duration, 1);
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    camera.position.lerpVectors(startPos, endPos, ease);
    controls.target.lerpVectors(startTarget, endTarget, ease);
    if (t >= 1) cameraAnim = null;
}

$('btn-reset-camera').addEventListener('click', () => {
    const spread = Math.max(dataObjects.length * 1.3, 10);
    animateCamera([0, spread * 0.5 + 5, spread * 0.7 + 8], [0, 2, 0]);
});
$('btn-iso-view').addEventListener('click', () => {
    const spread = Math.max(dataObjects.length * 1.3, 10);
    animateCamera([spread * 0.7, spread * 0.6 + 6, spread * 0.7], [0, 1.5, 0]);
});
$('btn-top-view').addEventListener('click', () => {
    const spread = Math.max(dataObjects.length * 1.3, 10);
    animateCamera([0, spread + 10, 0.1], [0, 0, 0]);
});
$('btn-front-view').addEventListener('click', () => {
    const spread = Math.max(dataObjects.length * 1.3, 10);
    animateCamera([0, 4, spread * 0.8 + 10], [0, 3, 0]);
});
$('btn-auto-rotate').addEventListener('click', () => {
    controls.autoRotate = !controls.autoRotate;
    controls.autoRotateSpeed = 2.0;
    $('btn-auto-rotate').style.background = controls.autoRotate ? '#e0e7ff' : '';
    $('btn-auto-rotate').style.color = controls.autoRotate ? '#4338ca' : '';
});
$('btn-toggle-grid').addEventListener('click', () => {
    gridHelper.visible = !gridHelper.visible;
});
$('btn-toggle-labels').addEventListener('click', () => {
    showLabels = !showLabels;
    domLabels.forEach(l => l.el.style.display = showLabels ? '' : 'none');
});
$('btn-fullscreen').addEventListener('click', () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
});

// 📸 3D 씬 고화질 스크린샷 캡처 다운로드 (고해상도 PNG 출력)
$('btn-screenshot')?.addEventListener('click', () => {
    hideTooltip();
    renderer.render(scene, camera);
    const canvas = renderer.domElement;
    const link = document.createElement('a');
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const timeStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const filename = `3D_시각화_${timeStr}.png`;
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast(`📸 <strong>3D 고해상도 이미지</strong>가 저장되었습니다! (<code>${filename}</code>)`);
});

// ⏳ 시계열/다차원 타임라인 플레이어 토글
btnToggleTimeline?.addEventListener('click', () => {
    if (!parsedData || !analysisResult || analysisResult.numericCols.length === 0) {
        showToast('⚠️ 재생할 수치 컬럼 데이터가 없습니다. 먼저 CSV를 업로드해 주세요.');
        return;
    }
    if (timePlayerBar.style.display === 'none') {
        openTimePlayer();
    } else {
        closeTimePlayer();
    }
});

// 📑 A4 분석 보고서 인쇄 및 PDF 저장
$('btn-print-report')?.addEventListener('click', generateAndPrintReport);

function generateAndPrintReport() {
    if (!parsedData || !analysisResult) {
        showToast('⚠️ 보고서를 생성할 데이터가 없습니다. 먼저 CSV나 엑셀 파일을 업로드해 주세요.');
        return;
    }

    const reportContainer = $('print-report-container');
    if (!reportContainer) return;

    hideTooltip();
    renderer.render(scene, camera);
    const snap3D = renderer.domElement.toDataURL('image/png');
    const snap2D = chart2d ? chart2d.toBase64Image() : '';

    const yIdx = parseInt(yAxisSelect.value);
    const xIdx = parseInt(xAxisSelect.value);
    const yColName = parsedData.headers[yIdx];
    const xColName = parsedData.headers[xIdx];
    const stats = analysisResult.numericStats[yColName] || {};

    const now = new Date();
    const dateStr = `${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()} ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    const fileNameStr = currentUploadedFile ? currentUploadedFile.name : (fileNameDisplay?.textContent || '데이터 세트');

    let tableRowsHtml = '';
    const previewRows = parsedData.rows.slice(0, 15);
    previewRows.forEach(r => {
        tableRowsHtml += '<tr>';
        parsedData.headers.slice(0, 6).forEach((_, ci) => {
            tableRowsHtml += `<td>${r[ci]}</td>`;
        });
        tableRowsHtml += '</tr>';
    });

    reportContainer.innerHTML = `
        <div class="report-header">
            <div class="report-title">
                <h2>📊 3D & 2D 데이터 시각화 분석 요약 보고서</h2>
                <p>3D Data Visualization & AI Statistical Summary Report</p>
            </div>
            <div class="report-meta">
                <div><strong>출력 일시:</strong> ${dateStr}</div>
                <div><strong>분석 파일:</strong> ${fileNameStr}</div>
                <div><strong>분석 지표:</strong> [X축: ${xColName}] × [Y축: ${yColName}]</div>
            </div>
        </div>

        <div class="report-stats-grid">
            <div class="report-stat-card">
                <div class="label">총 데이터 건수</div>
                <div class="val">${parsedData.rows.length.toLocaleString()}건</div>
            </div>
            <div class="report-stat-card">
                <div class="label">합계 (Total Sum)</div>
                <div class="val">${fmt(stats.sum || 0)}</div>
            </div>
            <div class="report-stat-card">
                <div class="label">평균값 (Mean)</div>
                <div class="val">${fmt(Math.round(stats.mean || 0))}</div>
            </div>
            <div class="report-stat-card">
                <div class="label">최대값 (Max)</div>
                <div class="val">${fmt(stats.max || 0)}</div>
            </div>
        </div>

        <div class="report-grid-images">
            <div class="report-img-box">
                <h4>🧊 3D 데이터 입체 모델링</h4>
                <img src="${snap3D}" alt="3D Visualization View">
            </div>
            <div class="report-img-box">
                <h4>📈 2D 분석 차트 그래프</h4>
                ${snap2D ? `<img src="${snap2D}" alt="2D Chart View">` : '<div style="height:180px; display:flex; align-items:center; justify-content:center; color:#94a3b8;">차트 없음</div>'}
            </div>
        </div>

        <div class="report-insight-box">
            <h4>💡 AI 실시간 통계 인사이트 요약</h4>
            <div>• <strong>데이터 통계 특성:</strong> ${yColName} 지표의 평균은 ${fmt(Math.round(stats.mean || 0))}이며, 최저값은 ${fmt(stats.min || 0)}, 최대값은 ${fmt(stats.max || 0)}입니다.</div>
            <div>• <strong>파레토 집중도:</strong> 상위 항목들이 전체 합계(${fmt(stats.sum || 0)})의 상당 부분을 점유하고 있으며, 3D 뷰 및 2D 그래프를 통해 분포를 한눈에 확인할 수 있습니다.</div>
        </div>

        <div style="margin-top: 14px;">
            <h4 style="margin: 0 0 6px 0; font-size: 13px; color: #334155;">📄 데이터 표 미리보기 (상위 ${previewRows.length}행)</h4>
            <table class="report-table">
                <thead>
                    <tr>${parsedData.headers.slice(0, 6).map(h => `<th>${h}</th>`).join('')}</tr>
                </thead>
                <tbody>${tableRowsHtml}</tbody>
            </table>
        </div>
    `;

    reportContainer.style.display = 'block';
    showToast('📑 <strong>인쇄 창</strong>이 열렸습니다. [대상: PDF로 저장]을 선택하시면 PDF 파일로 저장됩니다!');

    setTimeout(() => {
        window.print();
    }, 250);

    window.onafterprint = () => {
        reportContainer.style.display = 'none';
    };
}

// 📂 전체화면 드래그 앤 드롭 파일 로더
const dragDropOverlay = $('drag-drop-overlay');
let dragCounter = 0;

window.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    if (dragDropOverlay) dragDropOverlay.style.display = 'flex';
});

window.addEventListener('dragover', (e) => {
    e.preventDefault();
});

window.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) {
        dragCounter = 0;
        if (dragDropOverlay) dragDropOverlay.style.display = 'none';
    }
});

window.addEventListener('drop', (e) => {
    e.preventDefault();
    dragCounter = 0;
    if (dragDropOverlay) dragDropOverlay.style.display = 'none';
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
        loadAndParseCSVFile(files[0]);
    }
});

// 키보드 단축키 지원 (Space: 회전, R: 기본뷰, G: 그리드, L: 라벨, M: 메뉴, ESC: 닫기)
window.addEventListener('keydown', (e) => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
    if (e.code === 'Space') {
        e.preventDefault();
        $('btn-auto-rotate')?.click();
    } else if (e.key === 'r' || e.key === 'R' || e.key === 'ㄱ') {
        $('btn-reset-camera')?.click();
    } else if (e.key === 'g' || e.key === 'G' || e.key === 'ㅎ') {
        $('btn-toggle-grid')?.click();
    } else if (e.key === 'l' || e.key === 'L' || e.key === 'ㅣ') {
        $('btn-toggle-labels')?.click();
    } else if (e.key === 'm' || e.key === 'M' || e.key === 'ㅡ') {
        $('btn-toggle-menu')?.click();
    } else if (e.key === 'Escape') {
        if (gpuInfoModal) gpuInfoModal.style.display = 'none';
        if (chartPanel) chartPanel.style.display = 'none';
        if (menuPanel && window.innerWidth <= 768) menuPanel.classList.remove('open');
    }
});

// ════════════════════════════════════════════════════════════
// 5. 대시보드 메뉴 & 아코디언 설정 (단일 패널 오픈)
// ════════════════════════════════════════════════════════════
function openAccordionSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    const header = section.querySelector('.accordion-header');
    const body = section.querySelector('.accordion-body');
    if (!header || !body) return;

    // 다른 모든 아코디언 닫기
    document.querySelectorAll('.accordion-header').forEach(h => {
        h.classList.remove('active');
        const icon = h.querySelector('.chevron');
        if (icon) icon.textContent = '▾';
    });
    document.querySelectorAll('.accordion-body').forEach(b => {
        b.classList.remove('open');
    });
    document.querySelectorAll('.accordion-item').forEach(it => {
        it.classList.remove('active');
    });

    // 선택된 섹션만 열기
    section.classList.add('active');
    header.classList.add('active');
    body.classList.add('open');
    const icon = header.querySelector('.chevron');
    if (icon) icon.textContent = '▴';

    setTimeout(() => {
        section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 60);
}

function initAccordion() {
    document.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', () => {
            const targetId = header.getAttribute('data-target');
            const targetBody = document.getElementById(targetId);
            const item = header.closest('.accordion-item');
            const isAlreadyOpen = targetBody && targetBody.classList.contains('open');

            // 다른 열려있는 모든 패널 닫기
            document.querySelectorAll('.accordion-header').forEach(h => {
                h.classList.remove('active');
                const icon = h.querySelector('.chevron');
                if (icon) icon.textContent = '▾';
            });
            document.querySelectorAll('.accordion-body').forEach(b => {
                b.classList.remove('open');
            });
            document.querySelectorAll('.accordion-item').forEach(it => {
                it.classList.remove('active');
            });

            // 클릭한 패널이 닫혀있었으면 열기 (이미 열려있었다면 닫힌 상태 유지)
            if (!isAlreadyOpen && targetBody) {
                header.classList.add('active');
                targetBody.classList.add('open');
                if (item) item.classList.add('active');
                const icon = header.querySelector('.chevron');
                if (icon) icon.textContent = '▴';

                setTimeout(() => {
                    item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 60);
            }
        });
    });
}
initAccordion();

// ════════════════════════════════════════════════════════════
// 메뉴 패널 완벽 스크롤 엔진 (마우스 휠 + 터치 드래그 + 마우스 드래그)
// ════════════════════════════════════════════════════════════
const menuContent = document.querySelector('.menu-content');
const btnScrollTop = $('btn-scroll-top');
const btnScrollBottom = $('btn-scroll-bottom');

if (btnScrollTop && menuContent) {
    btnScrollTop.addEventListener('click', () => {
        menuContent.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

if (btnScrollBottom && menuContent) {
    btnScrollBottom.addEventListener('click', () => {
        menuContent.scrollTo({ top: menuContent.scrollHeight, behavior: 'smooth' });
    });
}

if (menuPanel && menuContent) {
    // 메뉴창 선택(활성화) 상태 관리 함수
    function activateMenuScroll() {
        controls.enabled = false; // 3D 카메라 줌/회전 일시 중단하여 메뉴 스크롤에 100% 집중
        menuPanel.classList.add('menu-active');
    }

    function deactivateMenuScroll() {
        controls.enabled = true;  // 3D 카메라 제어 복원
        menuPanel.classList.remove('menu-active');
    }

    // 메뉴창 클릭, 호버, 터치, 포커스 시 즉각 선택 & 3D 카메라 줌 차단
    menuPanel.addEventListener('mouseenter', activateMenuScroll);
    menuPanel.addEventListener('mousedown', activateMenuScroll);
    menuPanel.addEventListener('touchstart', activateMenuScroll, { passive: true });
    menuPanel.addEventListener('focusin', activateMenuScroll);

    // 메뉴창을 벗어나거나 3D 캔버스를 터치/클릭하면 3D 컨트롤 복원
    menuPanel.addEventListener('mouseleave', deactivateMenuScroll);
    renderer.domElement.addEventListener('mousedown', deactivateMenuScroll);
    renderer.domElement.addEventListener('touchstart', deactivateMenuScroll, { passive: true });

    // 1. 마우스 휠 스크롤 (브라우저 기본 동작 차단 & 메뉴 전용 직접 스크롤)
    menuPanel.addEventListener('wheel', (e) => {
        activateMenuScroll();
        e.stopPropagation();
        e.preventDefault();
        menuContent.scrollTop += e.deltaY;
    }, { passive: false });

    // 2. 터치 제스처 스크롤 (모바일 / 태블릿 손가락 드래그 스크롤 완벽 대응)
    let touchStartY = 0;
    let touchStartScrollTop = 0;
    let isTouchActive = false;

    menuPanel.addEventListener('touchstart', (e) => {
        // 슬라이더, 입력창, 버튼, 셀렉트 등 터치 시 스크롤이 터치를 가로채지 않도록 방어
        const interactiveTags = ['INPUT', 'SELECT', 'BUTTON', 'LABEL', 'TEXTAREA'];
        if (interactiveTags.includes(e.target.tagName) || e.target.closest('button, select, input, label, .control-group, .range-row')) {
            isTouchActive = false;
            return;
        }
        if (e.touches.length === 1) {
            activateMenuScroll();
            isTouchActive = true;
            touchStartY = e.touches[0].clientY;
            touchStartScrollTop = menuContent.scrollTop;
        }
    }, { passive: true });

    menuPanel.addEventListener('touchmove', (e) => {
        if (!isTouchActive || e.touches.length !== 1) return;
        // 터치 대상이 슬라이더라면 메뉴 스크롤 중단
        if (e.target.closest('input[type="range"]')) {
            isTouchActive = false;
            return;
        }
        e.stopPropagation();
        e.preventDefault();
        const currentY = e.touches[0].clientY;
        const diffY = touchStartY - currentY;
        menuContent.scrollTop = touchStartScrollTop + diffY;
    }, { passive: false });

    menuPanel.addEventListener('touchend', () => {
        isTouchActive = false;
    }, { passive: true });

    menuPanel.addEventListener('touchcancel', () => {
        isTouchActive = false;
    }, { passive: true });

    // 3. 마우스 드래그 스크롤 (데스크톱 마우스로 잡고 끌어당기기 지원)
    let isMouseDragging = false;
    let mouseStartY = 0;
    let mouseStartScrollTop = 0;

    menuContent.addEventListener('mousedown', (e) => {
        const interactiveTags = ['INPUT', 'SELECT', 'BUTTON', 'LABEL', 'TEXTAREA'];
        if (interactiveTags.includes(e.target.tagName) || e.target.closest('button, select, input, label')) {
            return;
        }
        activateMenuScroll();
        isMouseDragging = true;
        mouseStartY = e.clientY;
        mouseStartScrollTop = menuContent.scrollTop;
        menuContent.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
        if (!isMouseDragging) return;
        const diffY = mouseStartY - e.clientY;
        menuContent.scrollTop = mouseStartScrollTop + diffY;
    });

    window.addEventListener('mouseup', () => {
        if (isMouseDragging) {
            isMouseDragging = false;
            menuContent.style.cursor = '';
        }
    });

    // 4. 키보드 방향키 스크롤 지원 (메뉴창 선택 상태에서 위/아래 방향키 및 PageUp/Down)
    menuPanel.addEventListener('keydown', (e) => {
        if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            menuContent.scrollTop += 60;
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            menuContent.scrollTop -= 60;
        } else if (e.key === 'PageDown') {
            e.preventDefault();
            menuContent.scrollTop += 220;
        } else if (e.key === 'PageUp') {
            e.preventDefault();
            menuContent.scrollTop -= 220;
        }
    });
}

// ── 3D 환경 및 조명 실시간 제어 ──
if ($('ambient-intensity')) {
    $('ambient-intensity').addEventListener('input', e => {
        ambientLight.intensity = parseFloat(e.target.value);
        if ($('val-ambient')) $('val-ambient').textContent = e.target.value;
    });
}
if ($('dir-intensity')) {
    $('dir-intensity').addEventListener('input', e => {
        dirLight.intensity = parseFloat(e.target.value);
        if ($('val-dir')) $('val-dir').textContent = e.target.value;
    });
}
if ($('point-intensity')) {
    $('point-intensity').addEventListener('input', e => {
        pointLight.intensity = parseFloat(e.target.value);
        if ($('val-point')) $('val-point').textContent = e.target.value;
    });
}
if ($('point-color')) {
    $('point-color').addEventListener('input', e => {
        pointLight.color = new THREE.Color(e.target.value);
    });
}
if ($('exposure-intensity')) {
    $('exposure-intensity').addEventListener('input', e => {
        renderer.toneMappingExposure = parseFloat(e.target.value);
        if ($('val-exposure')) $('val-exposure').textContent = e.target.value;
    });
}
if ($('camera-fov')) {
    $('camera-fov').addEventListener('input', e => {
        camera.fov = parseInt(e.target.value);
        camera.updateProjectionMatrix();
        if ($('val-fov')) $('val-fov').textContent = e.target.value + '°';
    });
}
if ($('fog-density')) {
    $('fog-density').addEventListener('input', e => {
        scene.fog.density = parseFloat(e.target.value);
        if ($('val-fog')) $('val-fog').textContent = e.target.value;
    });
}
if ($('shadow-toggle')) {
    $('shadow-toggle').addEventListener('change', e => {
        dirLight.castShadow = e.target.checked;
        renderer.shadowMap.needsUpdate = true;
    });
}

// 조명 & 환경설정 기본값 복원 버튼
if ($('btn-reset-lighting')) {
    $('btn-reset-lighting').addEventListener('click', () => {
        // 1. 환경광
        ambientLight.intensity = 0.8;
        if ($('ambient-intensity')) $('ambient-intensity').value = 0.8;
        if ($('val-ambient')) $('val-ambient').textContent = '0.8';

        // 2. 직사광
        dirLight.intensity = 0.9;
        if ($('dir-intensity')) $('dir-intensity').value = 0.9;
        if ($('val-dir')) $('val-dir').textContent = '0.9';

        // 3. 포인트 라이트
        pointLight.intensity = 0.8;
        pointLight.color = new THREE.Color(0x818cf8);
        if ($('point-intensity')) $('point-intensity').value = 0.8;
        if ($('val-point')) $('val-point').textContent = '0.8';
        if ($('point-color')) $('point-color').value = '#818cf8';

        // 4. 노출
        renderer.toneMappingExposure = 1.1;
        if ($('exposure-intensity')) $('exposure-intensity').value = 1.1;
        if ($('val-exposure')) $('val-exposure').textContent = '1.1';

        // 5. 카메라 FOV
        camera.fov = 55;
        camera.updateProjectionMatrix();
        if ($('camera-fov')) $('camera-fov').value = 55;
        if ($('val-fov')) $('val-fov').textContent = '55°';

        // 6. 안개
        scene.fog.density = 0.015;
        if ($('fog-density')) $('fog-density').value = 0.015;
        if ($('val-fog')) $('val-fog').textContent = '0.015';

        // 7. 그림자
        dirLight.castShadow = true;
        if ($('shadow-toggle')) $('shadow-toggle').checked = true;

        // 8. 배경색
        const defaultBg = '#f1f5f9';
        scene.background = new THREE.Color(defaultBg);
        scene.fog.color = new THREE.Color(defaultBg);
        if ($('bg-color')) $('bg-color').value = defaultBg;

        showToast('💡 조명 및 환경설정이 기본값으로 초기화되었습니다.');
    });
}

// 모바일 터치 슬라이더 부드러운 조작 (터치 홀드 & 좌우 스와이프 시 부모 스크롤/줌 방지)
['ambient-intensity', 'dir-intensity', 'point-intensity', 'exposure-intensity', 'camera-fov', 'fog-density', 'time-slider-range'].forEach(id => {
    const el = $(id);
    if (el) {
        el.addEventListener('touchstart', (e) => {
            e.stopPropagation();
        }, { passive: true });
        el.addEventListener('touchmove', (e) => {
            e.stopPropagation();
        }, { passive: true });
    }
});
$('bg-color').addEventListener('input', e => {
    const c = e.target.value;
    scene.background = new THREE.Color(c);
    scene.fog.color = new THREE.Color(c);
});
$('bar-style').addEventListener('change', () => {
    if (parsedData && analysisResult) applyVisualization();
});
if (colorThemeSelect) {
    colorThemeSelect.addEventListener('change', () => {
        if (customColorGroup) {
            customColorGroup.style.display = colorThemeSelect.value === 'custom' ? 'block' : 'none';
        }
        if (parsedData && analysisResult) applyVisualization();
    });
}
if (customColorPicker) {
    customColorPicker.addEventListener('input', (e) => {
        if (customColorCode) customColorCode.value = e.target.value.toUpperCase();
        if (colorThemeSelect && colorThemeSelect.value === 'custom') {
            if (parsedData && analysisResult) applyVisualization();
        }
    });
}
if (customColorCode) {
    customColorCode.addEventListener('input', (e) => {
        let val = e.target.value.trim();
        if (!val.startsWith('#') && val.length > 0) val = '#' + val;
        if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(val)) {
            if (customColorPicker) customColorPicker.value = val;
            if (colorThemeSelect && colorThemeSelect.value === 'custom') {
                if (parsedData && analysisResult) applyVisualization();
            }
        }
    });
}

// ════════════════════════════════════════════════════════════
// 8. CSV 파싱 및 한글/다중 인코딩 디코더 (UTF-8, EUC-KR / CP949 자동 감지)
// ════════════════════════════════════════════════════════════
/**
 * 바이너리 ArrayBuffer를 문자열로 디코딩 (한국어 엑셀 ANSI 자동 감지)
 * 
 * [동작 원리]
 * 1) mode가 수동 지정인 경우 해당 디코더로 즉시 변환
 * 2) mode가 'auto'인 경우:
 *    - UTF-8 BOM(0xEF, 0xBB, 0xBF) 존재 여부 검사
 *    - TextDecoder('utf-8', { fatal: true })로 strict 파싱 시도
 *    - 한국어 엑셀(CP949/EUC-KR) 바이트가 포함되어 파싱 예외 발생 시 즉시 'euc-kr' 디코더로 폴백
 * @param {ArrayBuffer} buffer - 파일 바이너리 버퍼
 * @param {string} mode - 'auto' | 'euc-kr' | 'utf-8'
 * @returns {string} 디코딩된 텍스트 문자열
 */
function decodeCSVBuffer(buffer, mode = 'auto') {
    const bytes = new Uint8Array(buffer);

    // 1. 수동 강제 지정 (EUC-KR / CP949)
    if (mode === 'euc-kr' || mode === 'cp949') {
        try {
            return new TextDecoder('euc-kr').decode(bytes);
        } catch (e) {
            console.warn('EUC-KR 디코딩 실패, UTF-8 폴백:', e);
            return new TextDecoder('utf-8').decode(bytes);
        }
    }

    // 2. 수동 강제 지정 (UTF-8)
    if (mode === 'utf-8') {
        return new TextDecoder('utf-8').decode(bytes);
    }

    // 3. 자동 감지 (mode === 'auto')
    // UTF-8 BOM (0xEF, 0xBB, 0xBF) 확인 시 UTF-8로 즉시 디코딩
    if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
        return new TextDecoder('utf-8').decode(bytes);
    }

    // 한국 엑셀(ANSI)은 CP949/EUC-KR로 저장되어 한글 바이트가 0x80 이상이며 UTF-8 구조에 부합하지 않음
    // strict utf-8 (fatal: true)로 시도하고, 예외 발생 시 EUC-KR로 디코딩
    try {
        const strictUtf8 = new TextDecoder('utf-8', { fatal: true });
        return strictUtf8.decode(bytes);
    } catch (e) {
        try {
            const eucKrDecoder = new TextDecoder('euc-kr');
            return eucKrDecoder.decode(bytes);
        } catch (err2) {
            console.warn('EUC-KR 디코더 실패, 기본 UTF-8 완화 디코딩 시도:', err2);
            return new TextDecoder('utf-8').decode(bytes);
        }
    }
}

/**
 * CSV 텍스트 문자열을 2차원 행렬 객체로 파싱
 * - 따옴표 안의 쉼표(,) 및 줄바꿈 이스케이프 지원
 * - 빈 줄 제거 및 헤더/데이터 행 정규화
 * @param {string} text - 원본 CSV 텍스트
 * @returns {{ headers: string[], rows: string[][] } | null}
 */
function parseCSV(text) {
    if (!text) return null;
    // UTF-8 BOM(\uFEFF) 제거 및 줄바꿈 통일
    text = text.replace(/^\uFEFF/, '').trim();
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    if (lines.length < 2) return null;
    const parseRow = (line) => {
        const result = []; let cur = ''; let inQ = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (inQ) {
                if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
                else if (ch === '"') inQ = false;
                else cur += ch;
            } else {
                if (ch === '"') inQ = true;
                else if (ch === ',') { result.push(cur.trim()); cur = ''; }
                else cur += ch;
            }
        }
        result.push(cur.trim());
        return result;
    };
    const headers = parseRow(lines[0]).map(h => h.trim());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const row = parseRow(lines[i]);
        if (row.length === headers.length && row.some(v => v !== '')) rows.push(row);
    }
    return rows.length ? { headers, rows } : null;
}

// ════════════════════════════════════════════════════════════
// 9. 스마트 통계 분석 및 AI 이상치 탐지 엔진
// ════════════════════════════════════════════════════════════
/**
 * 로드된 데이터셋을 다각도로 분석하여 컬럼 속성 분류, 기술 통계량, 추천 차트 도출
 * @param {{ headers: string[], rows: string[][] }} data 
 * @returns {Object} 종합 분석 결과 객체
 */
function analyzeData(data) {
    const { headers, rows } = data;
    const colCount = headers.length, rowCount = rows.length;
    const columnTypes = [], numericCols = [], categoryCols = [], dateCols = [];

    for (let c = 0; c < colCount; c++) {
        const vals = rows.map(r => r[c]).filter(v => v !== '');
        const numRatio = vals.filter(v => !isNaN(parseFloat(v)) && isFinite(v)).length / Math.max(vals.length, 1);
        const datePatterns = [/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/, /^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/, /^\d{4}년/, /^\d{4}$/];
        const dateRatio = vals.filter(v => datePatterns.some(p => p.test(v))).length / Math.max(vals.length, 1);

        if (numRatio >= 0.8) { columnTypes.push('number'); numericCols.push(c); }
        else if (dateRatio >= 0.6) { columnTypes.push('date'); dateCols.push(c); }
        else { columnTypes.push('category'); categoryCols.push(c); }
    }

    const numericStats = {};
    numericCols.forEach(c => {
        const vals = rows.map(r => parseFloat(r[c])).filter(v => !isNaN(v));
        if (!vals.length) return;
        const sum = vals.reduce((a, b) => a + b, 0);
        const mean = sum / vals.length;
        const sorted = [...vals].sort((a, b) => a - b);
        numericStats[headers[c]] = {
            sum, mean, min: sorted[0], max: sorted[sorted.length - 1],
            median: sorted[Math.floor(sorted.length / 2)], count: vals.length,
            stddev: Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length)
        };
    });

    const categoryInfo = {};
    categoryCols.forEach(c => {
        const vals = rows.map(r => r[c]).filter(v => v !== '');
        const unique = [...new Set(vals)];
        categoryInfo[headers[c]] = { uniqueCount: unique.length, topValues: unique.slice(0, 20) };
    });

    const recommendedCharts = getRecommendations(rowCount, numericCols, categoryCols, dateCols, headers, categoryInfo);
    return { rowCount, colCount, columnTypes, numericCols, categoryCols, dateCols, numericStats, categoryInfo, recommendedCharts, headers };
}

function getRecommendations(rowCount, numericCols, categoryCols, dateCols, headers, categoryInfo) {
    const recs = [];
    const hasDate = dateCols.length > 0, hasCat = categoryCols.length > 0, hasNum = numericCols.length > 0;

    if (hasDate && hasNum) recs.push({ type: 'line', reason: '시계열 추세 분석' });
    if (hasCat && hasNum) {
        const uq = categoryInfo[headers[categoryCols[0]]]?.uniqueCount || 0;
        if (uq <= 8) { recs.push({ type: 'pie', reason: `${uq}개 카테고리 비율` }); recs.push({ type: 'doughnut', reason: '도넛 비율' }); }
        if (uq <= 15) { recs.push({ type: 'bar', reason: '카테고리별 비교' }); recs.push({ type: 'radar', reason: '다항목 비교' }); }
        else recs.push({ type: 'horizontalBar', reason: `많은 항목(${uq}개) 가로 비교` });
    }
    if (numericCols.length >= 2) recs.push({ type: 'scatter', reason: '수치 상관관계 분석' });
    if (!hasCat && !hasDate && hasNum) recs.push({ type: 'bar', reason: '수치 비교' });
    if (!recs.length) recs.push({ type: 'bar', reason: '기본 막대' });
    return recs;
}

// ════════════════════════════════════════════════════════════
// 8. 분석 결과 UI 표출
// ════════════════════════════════════════════════════════════
function displayAnalysis(analysis) {
    analysisSection.style.display = '';
    const tl = { number: '숫자', date: '날짜', category: '문자' };
    let html = '';
    html += statRow('행 × 열', `${analysis.rowCount} × ${analysis.colCount}`);
    html += `<div class="stat-row"><span class="stat-label">컬럼</span><span class="stat-value" style="font-size:11px;">`;
    analysis.columnTypes.forEach((t, i) => { html += `${analysis.headers[i]}(${tl[t]}) `; });
    html += `</span></div>`;

    Object.entries(analysis.numericStats).forEach(([col, s]) => {
        html += `<div style="margin-top:8px;"><strong style="color:#4338ca;">${col}</strong></div>`;
        html += statRow('평균', fmt(s.mean));
        html += statRow('범위', `${fmt(s.min)} ~ ${fmt(s.max)}`);
        html += statRow('합계', fmt(s.sum));
        html += statRow('표준편차', fmt(s.stddev));
    });

    html += `<div id="dynamic-recommend-box"></div>`;
    analysisResultEl.innerHTML = html;
    renderAIInsights(analysis);
}

// ════════════════════════════════════════════════════════════
// 8-1. AI 인사이트 & 이상치(Anomaly) 자동 브리핑 엔진
// ════════════════════════════════════════════════════════════
function renderAIInsights(analysis) {
    const box = $('ai-insight-box');
    if (!box || !parsedData || !yAxisSelect) return;

    const yIdx = parseInt(yAxisSelect.value);
    const xIdx = parseInt(xAxisSelect.value);
    if (isNaN(yIdx) || isNaN(xIdx) || !parsedData.headers[yIdx]) return;

    const yColName = parsedData.headers[yIdx];
    const rows = parsedData.rows;
    const items = rows.map((r, i) => ({
        label: String(r[xIdx] || `항목 #${i + 1}`),
        value: parseFloat(r[yIdx]) || 0,
        idx: i
    })).filter(item => !isNaN(item.value));

    if (items.length === 0) {
        box.innerHTML = '';
        return;
    }

    // 1. 기본 통계 지표 산출
    const values = items.map(d => d.value).sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / count;
    const median = count % 2 === 0 ? (values[count / 2 - 1] + values[count / 2]) / 2 : values[Math.floor(count / 2)];

    // 2. IQR 기반 이상치(Outlier) 자동 탐지 (Q1 - 1.5*IQR, Q3 + 1.5*IQR)
    const q1 = values[Math.floor(count * 0.25)];
    const q3 = values[Math.floor(count * 0.75)];
    const iqr = Math.max(q3 - q1, 0.0001);
    const upperLimit = q3 + 1.5 * iqr;
    const lowerLimit = q1 - 1.5 * iqr;

    const outliers = items.filter(d => d.value > upperLimit || d.value < lowerLimit);

    // 3. 파레토 법칙(80/20 법칙) 집중도 계산
    const sortedDesc = [...items].sort((a, b) => b.value - a.value);
    const top20Count = Math.max(1, Math.round(count * 0.2));
    const top20Sum = sortedDesc.slice(0, top20Count).reduce((acc, cur) => acc + cur.value, 0);
    const top20Share = sum > 0 ? ((top20Sum / sum) * 100).toFixed(1) : 0;

    // 4. 변동계수 (CV)
    const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / count;
    const stddev = Math.sqrt(variance);
    const cv = mean > 0 ? (stddev / mean) : 0;

    let cvDesc = '항목 간 편차가 적당하며 안정적인 분포입니다.';
    if (cv < 0.3) cvDesc = '모든 항목이 고르게 평준화되어 차이가 적습니다.';
    else if (cv > 0.8) cvDesc = '항목 간 격차가 극심하여 상위 항목에 쏠려 있습니다.';

    // HTML 구성
    let html = `
    <div class="ai-insight-header">
        <div class="ai-insight-title">
            <span>✨ AI 실시간 데이터 인사이트</span>
        </div>
        <span class="ai-insight-badge">통계 분석 완료</span>
    </div>
    <div class="ai-insight-list">
        <div class="ai-insight-item highlight">
            📌 <strong>지표 요약:</strong> [${yColName}] 총합 <strong>${fmt(sum)}</strong>, 평균 <strong>${fmt(Math.round(mean))}</strong> (중앙값 ${fmt(Math.round(median))})
        </div>
        <div class="ai-insight-item">
            📊 <strong>파레토 집중도:</strong> 상위 <strong>${top20Count}개(${Math.round(top20Count/count*100)}%)</strong> 항목이 전체의 <strong>${top20Share}%</strong>를 차지하고 있습니다. (${cvDesc})
        </div>
    `;

    if (outliers.length > 0) {
        const topOutlier = outliers.sort((a, b) => b.value - a.value)[0];
        const ratio = mean > 0 ? (topOutlier.value / mean).toFixed(1) : '-';
        html += `
        <div class="ai-insight-item outlier">
            ⚠️ <strong>이상치(Anomaly) 감지 (${outliers.length}건):</strong> [${topOutlier.label}] 항목이 <strong>${fmt(topOutlier.value)}</strong>로 평균의 <strong>${ratio}배</strong>에 달하는 통계적 극단값입니다.
            <button type="button" id="btn-highlight-outliers" class="ai-outlier-btn">
                ⚡ 이상치 ${outliers.length}건 3D 집중 하이라이트
            </button>
        </div>
        `;
    } else {
        html += `
        <div class="ai-insight-item">
            ✅ <strong>이상치 검증:</strong> 1.5×IQR 기준을 벗어나는 극단적 이상치가 없으며 안정적입니다.
        </div>
        `;
    }

    html += `</div>`;
    box.innerHTML = html;

    // 이상치 하이라이트 버튼 이벤트
    $('btn-highlight-outliers')?.addEventListener('click', () => {
        if (!outliers.length) return;
        const target = dataObjects[outliers[0].idx];
        if (target) {
            selectObject(target, outliers[0].idx);
            showToast(`🎯 이상치 <strong>[${outliers[0].label}]</strong>에 카메라를 집중했습니다!`);
        }
    });
}

// ════════════════════════════════════════════════════════════
// 8-2. 시계열/다차원 타임슬라이더 애니메이션 플레이어
// ════════════════════════════════════════════════════════════
let timePlayerTimer = null;
let currentTimeStep = 0;

function initTimePlayer() {
    if (!analysisResult || !analysisResult.numericCols || analysisResult.numericCols.length === 0) {
        if (timePlayerBar) timePlayerBar.style.display = 'none';
        return;
    }

    const numCols = analysisResult.numericCols;
    const curY = parseInt(yAxisSelect.value);
    let curStep = numCols.indexOf(curY);
    if (curStep === -1) curStep = 0;
    currentTimeStep = curStep;

    if (timeSliderRange) {
        timeSliderRange.min = 0;
        timeSliderRange.max = numCols.length - 1;
        timeSliderRange.value = curStep;
    }
    updateTimePlayerUI();

    // 여러 개의 수치 열이 있을 경우 타임라인 플레이어 버튼 표시
    if (numCols.length > 1) {
        if (btnToggleTimeline) btnToggleTimeline.style.display = '';
    }
}

function updateTimePlayerUI() {
    if (!analysisResult || !analysisResult.numericCols || !parsedData) return;
    const numCols = analysisResult.numericCols;
    if (currentTimeStep < 0 || currentTimeStep >= numCols.length) currentTimeStep = 0;

    const colIdx = numCols[currentTimeStep];
    const colName = parsedData.headers[colIdx] || `컬럼 #${colIdx}`;

    if (timeStepBadge) timeStepBadge.textContent = `${currentTimeStep + 1} / ${numCols.length}`;
    if (timeColName) timeColName.textContent = colName;
    if (timeSliderRange) timeSliderRange.value = currentTimeStep;
}

function openTimePlayer() {
    if (!timePlayerBar) return;
    initTimePlayer();
    timePlayerBar.style.display = 'flex';
    showToast('⏳ <strong>타임라인 플레이어</strong>가 활성화되었습니다. 재생(▶) 버튼을 눌러보세요!');
}

function closeTimePlayer() {
    if (!timePlayerBar) return;
    stopTimePlay();
    timePlayerBar.style.display = 'none';
}

function setTimeStep(step) {
    if (!analysisResult || !analysisResult.numericCols || !parsedData) return;
    const numCols = analysisResult.numericCols;
    if (step < 0) step = numCols.length - 1;
    if (step >= numCols.length) step = 0;

    currentTimeStep = step;
    const colIdx = numCols[currentTimeStep];
    yAxisSelect.value = colIdx;

    updateTimePlayerUI();
    applyVisualization();
}

function toggleTimePlay() {
    if (timePlayerTimer) {
        stopTimePlay();
    } else {
        startTimePlay();
    }
}

function startTimePlay() {
    if (!analysisResult || !analysisResult.numericCols) return;
    stopTimePlay();
    const speed = parseInt(timeSpeedSelect?.value) || 900;
    if (btnTimePlay) {
        btnTimePlay.textContent = '⏸ 정지';
        btnTimePlay.classList.add('playing');
    }

    timePlayerTimer = setInterval(() => {
        const nextStep = (currentTimeStep + 1) % analysisResult.numericCols.length;
        setTimeStep(nextStep);
    }, speed);
}

function stopTimePlay() {
    if (timePlayerTimer) {
        clearInterval(timePlayerTimer);
        timePlayerTimer = null;
    }
    if (btnTimePlay) {
        btnTimePlay.textContent = '▶ 재생';
        btnTimePlay.classList.remove('playing');
    }
}

// 타임라인 플레이어 이벤트 바인딩
btnTimePlay?.addEventListener('click', toggleTimePlay);
btnTimePrev?.addEventListener('click', () => {
    stopTimePlay();
    setTimeStep(currentTimeStep - 1);
});
btnTimeNext?.addEventListener('click', () => {
    stopTimePlay();
    setTimeStep(currentTimeStep + 1);
});
timeSliderRange?.addEventListener('input', (e) => {
    stopTimePlay();
    setTimeStep(parseInt(e.target.value));
});
timeSpeedSelect?.addEventListener('change', () => {
    if (timePlayerTimer) {
        startTimePlay();
    }
});
btnCloseTimePlayer?.addEventListener('click', closeTimePlayer);

function statRow(label, value) {
    return `<div class="stat-row"><span class="stat-label">${label}</span><span class="stat-value">${value}</span></div>`;
}
function fmt(n) { return typeof n === 'number' ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : n; }

// ════════════════════════════════════════════════════════════
// 9. 축 & 필터 설정
// ════════════════════════════════════════════════════════════
function updateAxisSelectors(analysis) {
    vizSection.style.display = '';
    filterSection.style.display = '';

    xAxisSelect.innerHTML = '';
    yAxisSelect.innerHTML = '';
    analysis.headers.forEach((h, i) => {
        xAxisSelect.appendChild(new Option(h, i));
        yAxisSelect.appendChild(new Option(h, i));
    });

    const defX = [...analysis.categoryCols, ...analysis.dateCols, 0][0];
    const defY = analysis.numericCols.length ? analysis.numericCols[0] : (analysis.headers.length > 1 ? 1 : 0);
    xAxisSelect.value = defX;
    yAxisSelect.value = defY;
    updateFilter(defX);

    // 대용량 데이터 시각화 최적화: 행 수가 30개 초과인 경우 상위 30개로 자동 세팅
    if (parsedData && parsedData.rows.length > 30) {
        if (limitSelect) limitSelect.value = '30';
        if (sortSelect) sortSelect.value = 'desc';
    } else {
        if (limitSelect) limitSelect.value = 'all';
    }
    if (filterKeyword) filterKeyword.value = '';

    // 수치 범위 입력창 플레이스홀더 설정
    const yColName = analysis.headers[defY];
    if (analysis.numericStats[yColName]) {
        rangeMin.placeholder = `최소 (${fmt(analysis.numericStats[yColName].min)})`;
        rangeMax.placeholder = `최대 (${fmt(analysis.numericStats[yColName].max)})`;
    }
}

function updateFilter(colIdx) {
    dataFilter.innerHTML = '<option value="all">전체 보기</option>';
    if (!parsedData) return;
    [...new Set(parsedData.rows.map(r => r[colIdx]))].slice(0, 60).forEach(v => {
        dataFilter.appendChild(new Option(v, v));
    });
}

// ════════════════════════════════════════════════════════════
// 10. 데이터 테이블 연동
// ════════════════════════════════════════════════════════════
function renderDataTable(data, highlightRow = -1) {
    const table = $('data-table');
    const rowCountEl = $('row-count');
    const max = 80;
    let html = '<thead><tr>';
    data.headers.forEach(h => { html += `<th>${h}</th>`; });
    html += '</tr></thead><tbody>';
    data.rows.slice(0, max).forEach((row, idx) => {
        html += `<tr class="${idx === highlightRow ? 'selected' : ''}" data-idx="${idx}">`;
        row.forEach(v => { html += `<td>${v}</td>`; });
        html += '</tr>';
    });
    html += '</tbody>';
    table.innerHTML = html;
    rowCountEl.textContent = `(${data.rows.length}행 중 ${Math.min(max, data.rows.length)}행 / ${Math.min(max, data.rows.length)} of ${data.rows.length} rows)`;

    table.querySelectorAll('tbody tr').forEach(tr => {
        tr.addEventListener('click', () => {
            const idx = parseInt(tr.dataset.idx);
            if (idx < dataObjects.length) selectObject(dataObjects[idx], idx);
        });
    });
}

// ════════════════════════════════════════════════════════════
// 12. 10종 3D 지오메트리 스타일 렌더러 (Cylinder, Pie, Tube, Scatter, Surface 등)
// ════════════════════════════════════════════════════════════
/**
 * 이전 렌더링된 모든 3D 오브젝트, 보조 라인/그리드, 텍스트 라벨을 씬에서 제거하고 GPU 메모리 해제(Dispose)
 * - Three.js WebGL 메모리 누수(Memory Leak) 완전 방지
 */
function clearScene() {
    // 1. 메인 데이터 메쉬 메모리 해제
    dataObjects.forEach(obj => {
        scene.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
            else obj.material.dispose();
        }
    });
    dataObjects = [];

    // 2. 보조 시각화 요소(튜브 라인, 가이드 기둥, 지형 메쉬 등) 메모리 해제
    extraVisuals.forEach(obj => {
        scene.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
    });
    extraVisuals = [];

    // 3. 화면에 투영된 2D 텍스트 DOM 라벨 제거
    domLabels.forEach(l => l.el.remove());
    domLabels = [];
    selectedObject = null;
    hoveredObject = null;
}

/**
 * 데이터의 분포, 시계열 여부, 범주 개수를 기반으로 최적의 3D 형태를 자동 추론
 * - 시계열 데이터: 3D 입체 튜브 라인 (Line)
 * - 소규모 범주(<=8): 3D 파이 슬라이스 (Pie)
 * - 다수 범주(>=10): 3D 원기둥 막대 (Cylinder)
 * - 연속 수치/지형: 3D 곡면 서피스 (Surface)
 * @returns {string} 3D 스타일 식별자
 */
function inferBest3DStyle(labels, values, analysis) {
    if (!analysis) return 'box';

    const xIdx = parseInt(xAxisSelect ? xAxisSelect.value : 0);
    const yIdx = parseInt(yAxisSelect ? yAxisSelect.value : (analysis.numericCols[0] || 0));
    const isXDate = analysis.dateCols.includes(xIdx);
    const count = labels.length;

    // 1) 날짜/시계열 축인 경우 -> 3D 튜브 라인 또는 입체 면적
    if (isXDate) {
        return count >= 10 ? 'area' : 'line';
    }

    // 2) 카테고리 수가 적고(<=8개) 비율/점유율 비교 -> 파이 또는 도넛
    if (count <= 8 && count >= 2) {
        return count <= 5 ? 'pie' : 'donut';
    }

    // 3) 수치형 컬럼이 2개 이상이고 산포도 확인 적합 -> 입체 산점도
    if (analysis.numericCols.length >= 2 && count > 14) {
        return 'scatter';
    }

    // 4) 항목이 16개 이상으로 연속적이거나 광범위 -> 3D 곡면 서피스
    if (count >= 16) {
        return 'surface';
    }

    // 5) 항목이 8~15개 범주 비교 -> 원기둥 타워 또는 피라미드
    if (count >= 8) {
        return 'cylinder';
    }

    return 'box';
}

// 현재 선택된 축/필터 데이터 옵션 기반 실시간 시각화 추천 계산
function getDynamicRecommendations(labels, values, analysis) {
    if (!analysis) return [];

    const xIdx = parseInt(xAxisSelect.value);
    const yIdx = parseInt(yAxisSelect.value);
    const isXDate = analysis.dateCols.includes(xIdx);
    const count = labels.length;
    const recs = [];

    if (isXDate) {
        recs.push({ type: 'line', reason: `X축[${analysis.headers[xIdx]}]이 시계열 데이터이므로 추세선이 가장 적합합니다.` });
        recs.push({ type: 'area', reason: '시간 경과에 따른 누적 볼륨을 3D 입체 면적으로 파악하기 좋습니다.' });
    }

    if (count <= 8 && count >= 2) {
        recs.push({ type: 'pie', reason: `항목 수(${count}개)가 적어 원형 비율 및 점유율 파악에 이상적입니다.` });
        recs.push({ type: 'donut', reason: '중앙 링 구조로 데이터 비율을 현대적으로 표현합니다.' });
    }

    if (analysis.numericCols.length >= 2) {
        recs.push({ type: 'scatter', reason: '다변량 수치 간의 상관관계 및 이상치 분포를 3D 공간에 매핑합니다.' });
    }

    if (count >= 15) {
        recs.push({ type: 'surface', reason: `항목 수(${count}개)가 많아 연속된 3D 곡면 지형으로 전반적 패턴을 조망하기 좋습니다.` });
        recs.push({ type: 'horizontalBar', reason: '많은 라벨을 가로로 배치하여 텍스트 겹침 없이 비교합니다.' });
    } else {
        recs.push({ type: 'bar', reason: '각 항목별 정밀한 수치 크기를 비교하기 가장 명확합니다.' });
        recs.push({ type: 'cylinder', reason: '원기둥 기둥으로 회전 대칭적 시인성을 제공합니다.' });
    }

    return recs;
}

// 데이터 옵션(X축/Y축/필터/정렬) 변경 시 실시간으로 추천 배지 및 가이드 갱신
function updateDynamicRecommendations(labels, values, analysis) {
    if (!analysis) return;

    const best3D = inferBest3DStyle(labels, values, analysis);
    const styleKorean = {
        pie: '🥧 3D 파이 슬라이스',
        donut: '🍩 3D 도넛 링 차트',
        line: '📈 3D 입체 튜브 라인',
        area: '🏔️ 3D 산악형 면적 차트',
        scatter: '🌐 3D 입체 산점도',
        surface: '🌊 3D 곡면 서피스',
        cylinder: '● 3D 원기둥 타워',
        pyramid: '🔺 3D 피라미드 타워',
        box: '📊 3D 직육면체 막대'
    }[best3D] || '📊 3D 막대';

    const recs = getDynamicRecommendations(labels, values, analysis);
    const typeIcons = { bar:'📊 막대', horizontalBar:'📊 가로막대', line:'📈 선', pie:'🥧 파이', doughnut:'🍩 도넛', scatter:'⚬ 산점도', radar:'🕸 레이더', polarArea:'🎯 폴라' };

    // 추천 2D 차트 결정
    const valid2DTypes = ['bar', 'horizontalBar', 'line', 'pie', 'doughnut', 'scatter', 'radar', 'polarArea'];
    const matched2D = recs.find(r => {
        const mapped = r.type === 'donut' ? 'doughnut' : r.type;
        return valid2DTypes.includes(mapped);
    });
    const best2DType = matched2D ? (matched2D.type === 'donut' ? 'doughnut' : matched2D.type) : 'bar';
    const best2DLabel = typeIcons[best2DType] || '📊 막대';

    let html = '';
    html += `<div style="margin-top:10px;"><strong style="color:#4338ca;">✨ 선택 데이터 자동 추천:</strong></div>`;
    html += `<div style="display:flex; flex-wrap:wrap; gap:4px; margin:4px 0;">`;
    html += `<span class="recommend-badge" style="background:#dcfce7; color:#15803d; font-size:11px; font-weight:700;">3D 자동적용: ${styleKorean}</span>`;
    html += `<span class="recommend-badge" style="background:#e0e7ff; color:#4338ca; font-size:11px; font-weight:700;">2D 자동적용: ${best2DLabel}</span>`;
    html += `</div>`;

    if (recs.length > 0) {
        html += `<div style="font-size:11px; color:#4f46e5; margin-top:5px; line-height:1.4; background:#f0fdf4; padding:6px 8px; border-radius:6px; border:1px solid #bbf7d0;">💡 ${recs[0].reason}</div>`;
    }

    const recEl = document.getElementById('dynamic-recommend-box');
    if (recEl) {
        recEl.innerHTML = html;
    }
}

// 색상 테마 팔레트 생성 함수
function getThemeColor(index, count, alpha = 1) {
    const theme = colorThemeSelect ? colorThemeSelect.value : 'vibrant';
    const t = count > 1 ? index / (count - 1) : 0;
    
    switch (theme) {
        case 'ocean': {
            // 깊은 인디고 -> 아쿠아 시안
            const hue = 190 + t * 45;
            return new THREE.Color(`hsl(${hue}, 85%, ${45 + t * 15}%)`);
        }
        case 'neon': {
            // 사이버펑크 핑크 -> 일렉트릭 퍼플 -> 네온 블루
            const hue = (280 + index * 40) % 360;
            return new THREE.Color(`hsl(${hue}, 95%, 60%)`);
        }
        case 'sunset': {
            // 따뜻한 앰버 옐로우 -> 오렌지 -> 핫핑크
            const hue = 35 + t * 310;
            return new THREE.Color(`hsl(${hue % 360}, 90%, 55%)`);
        }
        case 'emerald': {
            // 산뜻한 라임 -> 에메랄드 딥그린 -> 민트
            const hue = 140 + t * 35;
            return new THREE.Color(`hsl(${hue}, 80%, ${40 + t * 15}%)`);
        }
        case 'gold': {
            // 럭셔리 골드 & 앰버 (#D97706 ~ #F59E0B ~ #FCD34D)
            const hue = 38 + t * 14;
            const lum = 46 + t * 20;
            return new THREE.Color(`hsl(${hue}, 92%, ${lum}%)`);
        }
        case 'pastel': {
            // 화사하고 부드러운 파스텔 마카롱 팔레트
            const hue = (index * 65 + 180) % 360;
            return new THREE.Color(`hsl(${hue}, 72%, 72%)`);
        }
        case 'fire': {
            // 딥레드 -> 크림슨 -> 블레이징 오렌지 -> 골든 옐로우
            const hue = 0 + t * 48;
            return new THREE.Color(`hsl(${hue}, 90%, ${48 + t * 14}%)`);
        }
        case 'aurora': {
            // 오로라 보레알리스 (네온 시안 -> 에메랄드 -> 바이올렛)
            const hue = (165 + t * 115) % 360;
            return new THREE.Color(`hsl(${hue}, 88%, ${50 + t * 10}%)`);
        }
        case 'monochrome': {
            // 모던 메탈릭 슬레이트 그레이 스케일
            const lum = 35 + t * 45;
            return new THREE.Color(`hsl(215, 20%, ${lum}%)`);
        }
        case 'custom': {
            // 사용자 지정 HEX 색상 코드 기반 팔레트 생성
            let hex = (customColorCode ? customColorCode.value : (customColorPicker ? customColorPicker.value : '#6366f1')).trim();
            if (!/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex)) {
                hex = (customColorPicker && customColorPicker.value) ? customColorPicker.value : '#6366f1';
            }
            const base = new THREE.Color(hex);
            const hsl = {};
            base.getHSL(hsl);
            // 각 항목별 명도와 색상에 부드러운 변주를 주어 입체감과 구별성 부여
            const lightnessShift = count > 1 ? (t - 0.5) * 0.35 : 0;
            const newL = Math.max(0.18, Math.min(0.85, hsl.l + lightnessShift));
            const hueShift = count > 1 ? (t - 0.5) * 0.08 : 0;
            const newH = (hsl.h + hueShift + 1) % 1;
            return new THREE.Color().setHSL(newH, Math.max(hsl.s, 0.4), newL);
        }
        case 'vibrant':
        default: {
            const hue = (index * (360 / Math.max(count, 1))) % 360;
            return new THREE.Color(`hsl(${hue}, 75%, 52%)`);
        }
    }
}

function render3DVisualization(labels, values) {
    clearScene();
    if (!values || !values.length) return;

    let selectedStyle = $('bar-style').value;
    if (selectedStyle === 'auto') {
        selectedStyle = inferBest3DStyle(labels, values, analysisResult);
    }

    switch (selectedStyle) {
        case 'pie': render3DPie(labels, values); break;
        case 'donut': render3DDonut(labels, values); break;
        case 'line': render3DLine(labels, values); break;
        case 'area': render3DArea(labels, values); break;
        case 'scatter': render3DScatter(labels, values); break;
        case 'surface': render3DSurface(labels, values); break;
        case 'pyramid': render3DBarMesh(labels, values, 'pyramid'); break;
        case 'cylinder': render3DBarMesh(labels, values, 'cylinder'); break;
        case 'box':
        default:
            render3DBarMesh(labels, values, 'box'); break;
    }
}

function render3DBarMesh(labels, values, shape = 'box') {
    const maxVal = Math.max(...values, 1);
    const scale = 8 / maxVal;
    const count = labels.length;

    labels.forEach((label, i) => {
        const val = values[i];
        const h = Math.max(val * scale, 0.1);
        const color = getThemeColor(i, count);

        let geometry;
        if (shape === 'cylinder') {
            geometry = new THREE.CylinderGeometry(0.38, 0.38, h, 24);
        } else if (shape === 'pyramid') {
            // 사각뿔 피라미드 타워 (top radius: 0, bottom radius: 0.5, 4 segments)
            geometry = new THREE.CylinderGeometry(0.02, 0.55, h, 4);
        } else {
            geometry = new THREE.BoxGeometry(0.72, h, 0.72);
        }

        const material = new THREE.MeshStandardMaterial({
            color, metalness: 0.25, roughness: 0.35,
            emissive: color.clone().multiplyScalar(0.08)
        });

        const mesh = new THREE.Mesh(geometry, material);
        const xPos = (i - (count - 1) / 2) * 1.35;
        mesh.position.set(xPos, h / 2, 0);
        if (shape === 'pyramid') mesh.rotation.y = Math.PI / 4;
        mesh.castShadow = true;
        mesh.receiveShadow = false;
        mesh.userData = { name: label, value: val, index: i, baseColor: color.clone(), baseY: h / 2 };

        scene.add(mesh);
        dataObjects.push(mesh);
        addDomLabel(label, xPos, -0.3, 0);
    });

    const spread = count * 1.35;
    animateCamera([0, spread * 0.4 + 5, spread * 0.6 + 8], [0, 2, 0]);
}

function render3DPie(labels, values) {
    render3DRing(labels, values, 0);
}

function render3DDonut(labels, values) {
    render3DRing(labels, values, 2.2);
}

function render3DRing(labels, values, innerRadius = 0) {
    const total = values.reduce((sum, v) => sum + Math.max(v, 0), 0) || 1;
    const outerRadius = 5.2;
    const thickness = 1.3;
    let currentAngle = 0;
    const count = labels.length;

    labels.forEach((label, i) => {
        const val = values[i];
        const sliceAngle = (Math.max(val, 0) / total) * Math.PI * 2;
        if (sliceAngle <= 0.001) return;

        const color = getThemeColor(i, count);
        const shape = new THREE.Shape();

        if (innerRadius > 0) {
            // 도넛 링 섹터
            shape.absarc(0, 0, outerRadius, currentAngle, currentAngle + sliceAngle, false);
            shape.absarc(0, 0, innerRadius, currentAngle + sliceAngle, currentAngle, true);
        } else {
            // 파이 부채꼴
            shape.moveTo(0, 0);
            shape.arc(0, 0, outerRadius, currentAngle, currentAngle + sliceAngle, false);
            shape.lineTo(0, 0);
        }

        const extrudeSettings = {
            depth: thickness, bevelEnabled: true, bevelSegments: 3,
            steps: 1, bevelSize: 0.08, bevelThickness: 0.08
        };

        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geometry.rotateX(-Math.PI / 2);

        const material = new THREE.MeshStandardMaterial({
            color, metalness: 0.25, roughness: 0.35,
            emissive: color.clone().multiplyScalar(0.06)
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(0, thickness, 0);
        mesh.castShadow = true;
        mesh.receiveShadow = false;

        const midAngle = currentAngle + sliceAngle / 2;
        const labelRadius = outerRadius + 1.2;
        const labelX = Math.cos(midAngle) * labelRadius;
        const labelZ = -Math.sin(midAngle) * labelRadius;

        mesh.userData = {
            name: `${label} (${((val / total) * 100).toFixed(1)}%)`,
            value: val, index: i, baseColor: color.clone(), midAngle
        };

        scene.add(mesh);
        dataObjects.push(mesh);
        addDomLabel(label, labelX, 0.2, labelZ);
        currentAngle += sliceAngle;
    });

    animateCamera([0, 11, 14], [0, 1, 0]);
}

function render3DArea(labels, values) {
    const maxVal = Math.max(...values, 1);
    const scale = 7 / maxVal;
    const count = labels.length;
    if (count < 2) {
        render3DBarMesh(labels, values, 'box');
        return;
    }

    const depth = 2.0;
    const shape = new THREE.Shape();
    const startX = (0 - (count - 1) / 2) * 1.5;
    shape.moveTo(startX, 0);

    const points = [];
    labels.forEach((label, i) => {
        const val = values[i];
        const y = Math.max(val * scale, 0.2);
        const x = (i - (count - 1) / 2) * 1.5;
        shape.lineTo(x, y);
        points.push({ x, y, val, label, i });
    });

    const endX = ((count - 1) - (count - 1) / 2) * 1.5;
    shape.lineTo(endX, 0);
    shape.lineTo(startX, 0);

    const extrudeSettings = { depth: depth, bevelEnabled: false };
    const areaGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const areaMat = new THREE.MeshStandardMaterial({
        color: 0x4f46e5, metalness: 0.2, roughness: 0.35,
        transparent: true, opacity: 0.85, side: THREE.DoubleSide
    });
    const areaMesh = new THREE.Mesh(areaGeo, areaMat);
    areaMesh.position.set(0, 0, -depth / 2);
    areaMesh.receiveShadow = false;
    areaMesh.castShadow = true;
    scene.add(areaMesh);
    extraVisuals.push(areaMesh);

    // 각 정점에 인터랙티브 데이터 노드 구체 배치
    points.forEach(p => {
        const color = getThemeColor(p.i, count);
        const nodeGeo = new THREE.SphereGeometry(0.35, 20, 20);
        const nodeMat = new THREE.MeshStandardMaterial({
            color, metalness: 0.3, roughness: 0.3,
            emissive: color.clone().multiplyScalar(0.2)
        });
        const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
        nodeMesh.position.set(p.x, p.y, 0);
        nodeMesh.castShadow = true;
        nodeMesh.userData = { name: p.label, value: p.val, index: p.i, baseColor: color.clone(), baseY: p.y };

        scene.add(nodeMesh);
        dataObjects.push(nodeMesh);
        addDomLabel(p.label, p.x, -0.3, 0);
    });

    const spread = count * 1.5;
    animateCamera([spread * 0.5, spread * 0.4 + 5, spread * 0.7 + 7], [0, 2, 0]);
}

function render3DLine(labels, values) {
    const maxVal = Math.max(...values, 1);
    const scale = 7 / maxVal;
    const count = labels.length;
    const points = [];

    labels.forEach((label, i) => {
        const val = values[i];
        const y = Math.max(val * scale, 0.2);
        const x = (i - (count - 1) / 2) * 1.5;
        const pt = new THREE.Vector3(x, y, 0);
        points.push(pt);

        const hue = (i * (360 / Math.max(count, 1))) % 360;
        const color = new THREE.Color(`hsl(${hue}, 80%, 50%)`);
        const nodeGeo = new THREE.SphereGeometry(0.35, 20, 20);
        const nodeMat = new THREE.MeshStandardMaterial({
            color, metalness: 0.3, roughness: 0.3,
            emissive: color.clone().multiplyScalar(0.2)
        });
        const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
        nodeMesh.position.copy(pt);
        nodeMesh.castShadow = true;
        nodeMesh.userData = { name: label, value: val, index: i, baseColor: color.clone(), baseY: y };

        scene.add(nodeMesh);
        dataObjects.push(nodeMesh);

        const stemGeo = new THREE.CylinderGeometry(0.04, 0.04, y, 8);
        const stemMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.6 });
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.set(x, y / 2, 0);
        scene.add(stem);
        extraVisuals.push(stem);

        addDomLabel(label, x, -0.3, 0);
    });

    if (points.length >= 2) {
        const curve = new THREE.CatmullRomCurve3(points);
        const tubeGeo = new THREE.TubeGeometry(curve, Math.max(count * 6, 40), 0.12, 12, false);
        const tubeMat = new THREE.MeshStandardMaterial({
            color: 0x4f46e5, metalness: 0.4, roughness: 0.2,
            emissive: 0x4338ca, emissiveIntensity: 0.3
        });
        const tube = new THREE.Mesh(tubeGeo, tubeMat);
        tube.castShadow = true;
        scene.add(tube);
        extraVisuals.push(tube);
    }

    const spread = count * 1.5;
    animateCamera([0, spread * 0.4 + 4, spread * 0.7 + 7], [0, 2, 0]);
}

function render3DScatter(labels, values) {
    const maxVal = Math.max(...values, 1);
    const count = labels.length;
    const yIdx = parseInt(yAxisSelect.value);
    const otherNumCols = (analysisResult?.numericCols || []).filter(c => c !== yIdx);
    const zIdx = otherNumCols.length > 0 ? otherNumCols[0] : null;

    let zValues = [];
    if (zIdx !== null && parsedData) {
        zValues = parsedData.rows.map(r => parseFloat(r[zIdx]) || 0);
    }
    const maxZ = zValues.length ? Math.max(...zValues, 1) : 1;

    labels.forEach((label, i) => {
        const val = values[i];
        const y = (val / maxVal) * 7 + 0.5;
        const x = (i - (count - 1) / 2) * 1.2;
        const z = zValues.length ? ((zValues[i] / maxZ) * 8 - 4) : Math.sin(i * 0.8) * 3;

        const sphereRadius = Math.max((val / maxVal) * 0.45 + 0.2, 0.2);
        const hue = (i * (360 / Math.max(count, 1))) % 360;
        const color = new THREE.Color(`hsl(${hue}, 80%, 50%)`);

        const geometry = new THREE.SphereGeometry(sphereRadius, 24, 24);
        const material = new THREE.MeshStandardMaterial({
            color, metalness: 0.3, roughness: 0.3,
            emissive: color.clone().multiplyScalar(0.15)
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.userData = { name: label, value: val, index: i, baseColor: color.clone(), baseY: y };

        scene.add(mesh);
        dataObjects.push(mesh);

        const lineGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(x, 0, z),
            new THREE.Vector3(x, y, z)
        ]);
        const lineMat = new THREE.LineDashedMaterial({ color: 0x94a3b8, dashSize: 0.3, gapSize: 0.2 });
        const line = new THREE.Line(lineGeo, lineMat);
        line.computeLineDistances();
        scene.add(line);
        extraVisuals.push(line);

        addDomLabel(label, x, -0.3, z);
    });

    animateCamera([0, 9, 16], [0, 2, 0]);
}

function render3DSurface(labels, values) {
    const maxVal = Math.max(...values, 1);
    const count = labels.length;
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);

    const width = 12;
    const depth = 12;
    const planeGeo = new THREE.PlaneGeometry(width, depth, cols - 1, rows - 1);
    const pos = planeGeo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
        const val = values[i % count] || 0;
        pos.setZ(i, (val / maxVal) * 6);
    }
    planeGeo.computeVertexNormals();

    const surfaceColor = getThemeColor(0, count);
    const planeMat = new THREE.MeshStandardMaterial({
        color: surfaceColor, metalness: 0.2, roughness: 0.4, side: THREE.DoubleSide
    });

    const surfaceMesh = new THREE.Mesh(planeGeo, planeMat);
    surfaceMesh.rotation.x = -Math.PI / 2;
    surfaceMesh.position.set(0, 0, 0);
    surfaceMesh.receiveShadow = false;
    surfaceMesh.castShadow = true;
    scene.add(surfaceMesh);
    extraVisuals.push(surfaceMesh);

    labels.forEach((label, i) => {
        const val = values[i];
        const c = i % cols;
        const r = Math.floor(i / cols);
        const x = (c / Math.max(cols - 1, 1) - 0.5) * width;
        const z = (r / Math.max(rows - 1, 1) - 0.5) * depth;
        const y = (val / maxVal) * 6 + 0.2;

        const pinGeo = new THREE.CylinderGeometry(0.08, 0.08, y, 8);
        const hue = (i * (360 / Math.max(count, 1))) % 360;
        const color = new THREE.Color(`hsl(${hue}, 80%, 55%)`);
        const pinMat = new THREE.MeshStandardMaterial({ color, emissive: color.clone().multiplyScalar(0.2) });
        const pinMesh = new THREE.Mesh(pinGeo, pinMat);
        pinMesh.position.set(x, y / 2, z);
        pinMesh.userData = { name: label, value: val, index: i, baseColor: color.clone(), baseY: y };

        scene.add(pinMesh);
        dataObjects.push(pinMesh);
        addDomLabel(label, x, -0.3, z);
    });

    animateCamera([10, 10, 15], [0, 2, 0]);
}

function addDomLabel(text, x, y, z) {
    const labelEl = document.createElement('div');
    labelEl.className = 'label-3d';
    labelEl.textContent = text;
    labelEl.style.display = showLabels ? '' : 'none';
    labelLayer.appendChild(labelEl);
    domLabels.push({ el: labelEl, worldPos: new THREE.Vector3(x, y, z) });
}

// ════════════════════════════════════════════════════════════
// 13. 3D ↔ 2D 좌표 투영 동기화 (Vector3.project)
// ════════════════════════════════════════════════════════════
const tempVec = new THREE.Vector3();

/**
 * 3D 월드 공간 좌표(Vector3)를 현재 카메라 시점에 맞춰 2D 화면 DOM 좌표(px)로 실시간 변환
 * - 카메라가 회전하거나 줌인/아웃되어도 텍스트 라벨이 3D 오브젝트 위치를 오차 없이 추적
 */
function syncLabelsToScreen() {
    const hw = window.innerWidth / 2;
    const hh = window.innerHeight / 2;

    domLabels.forEach(({ el, worldPos }) => {
        tempVec.copy(worldPos).project(camera);
        // 카메라 뒤편에 위치한 경우 투명 처리
        if (tempVec.z > 1) { el.style.opacity = '0'; return; }
        el.style.left = (tempVec.x * hw + hw) + 'px';
        el.style.top = (-tempVec.y * hh + hh) + 'px';
        el.style.opacity = '1';
    });
}

/**
 * 마우스 포인터 위치에 3D 메쉬 데이터 툴팁 표출
 */
function showTooltipAt(obj, screenX, screenY) {
    const ud = obj.userData;
    tooltipName.textContent = ud.name;
    tooltipValue.textContent = typeof ud.value === 'number' ? ud.value.toLocaleString() : ud.value;
    hoverTooltip.style.display = '';
    hoverTooltip.style.left = (screenX + 18) + 'px';
    hoverTooltip.style.top = (screenY - 10) + 'px';
}
function hideTooltip() { hoverTooltip.style.display = 'none'; }

// ════════════════════════════════════════════════════════════
// 14. 3D 레이캐스팅 광선 추적 (Hover 발광 & Click 카메라 포커싱)
// ════════════════════════════════════════════════════════════
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

/**
 * 마우스/터치 포인터 이동 시 3D 공간으로 광선을 투사(Raycasting)하여 호버 개체 감지
 * - 호버된 메쉬: 1.08배 스케일업 확대 및 발광(Emissive) 효과
 */
function onPointerMove(event) {
    if (!dataObjects.length) return;
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(dataObjects);

    if (hoveredObject && hoveredObject !== selectedObject) {
        resetObjectAppearance(hoveredObject);
    }

    if (hits.length > 0) {
        const obj = hits[0].object;
        hoveredObject = obj;
        if (obj !== selectedObject) {
            obj.material.emissive.copy(obj.userData.baseColor).multiplyScalar(0.3);
        }
        container.style.cursor = 'pointer';
        showTooltipAt(obj, event.clientX, event.clientY);
    } else {
        hoveredObject = null;
        container.style.cursor = 'grab';
        hideTooltip();
    }
}
renderer.domElement.addEventListener('pointermove', onPointerMove);

function onPointerClick(event) {
    if (!dataObjects.length) return;
    if (event.target.closest('#dashboard-panel') || event.target.closest('#chart-panel') || event.target.closest('#top-bar')) return;

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(dataObjects);

    if (hits.length > 0) {
        selectObject(hits[0].object, hits[0].object.userData.index);
    } else {
        deselectAll();
    }
}
window.addEventListener('click', onPointerClick);

function selectObject(obj, idx) {
    deselectAll();
    selectedObject = obj;
    obj.material.emissive.set(0x4f46e5);
    obj.material.emissiveIntensity = 0.6;

    showDetailCard(obj.userData, idx);
    highlightTableRow(idx);

    const pos = obj.position;
    animateCamera(
        [pos.x + 3, pos.y + 5, pos.z + 6],
        [pos.x, pos.y, pos.z]
    );
}

function deselectAll() {
    dataObjects.forEach(resetObjectAppearance);
    selectedObject = null;
    detailSection.style.display = 'none';
    document.querySelectorAll('#data-table tr.selected').forEach(tr => tr.classList.remove('selected'));
}

function resetObjectAppearance(obj) {
    if (!obj.userData.baseColor) return;
    obj.material.emissive.copy(obj.userData.baseColor).multiplyScalar(0.05);
    obj.material.emissiveIntensity = 1;
}

function highlightTableRow(idx) {
    document.querySelectorAll('#data-table tbody tr').forEach((tr, i) => {
        tr.classList.toggle('selected', i === idx);
    });
    const row = document.querySelector(`#data-table tbody tr[data-idx="${idx}"]`);
    if (row) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

// ════════════════════════════════════════════════════════════
// 14. 상세 카드 & 미니 차트 (라이트 테마)
// ════════════════════════════════════════════════════════════
function showDetailCard(ud, idx) {
    detailSection.style.display = '';
    openAccordionSection('detail-card-section');
    if (menuPanel) menuPanel.classList.add('open');
    detailName.textContent = `📌 ${ud.name}`;

    if (!parsedData) return;
    const row = parsedData.rows[idx];
    let html = `<div class="stat-highlight">${typeof ud.value === 'number' ? ud.value.toLocaleString() : ud.value}</div>`;
    parsedData.headers.forEach((h, ci) => {
        html += statRow(h, row[ci]);
    });

    if (analysisResult && analysisResult.numericCols.length > 0) {
        const yIdx = parseInt(yAxisSelect.value);
        const allVals = parsedData.rows.map(r => parseFloat(r[yIdx]) || 0);
        const sorted = [...allVals].sort((a, b) => b - a);
        const rank = sorted.indexOf(parseFloat(row[yIdx]) || 0) + 1;
        html += statRow('순위', `${rank} / ${allVals.length}`);
        const pct = ((parseFloat(row[yIdx]) || 0) / Math.max(...allVals, 1) * 100).toFixed(1);
        html += statRow('최대값 대비', `${pct}%`);
    }
    detailStats.innerHTML = html;
    renderMiniChart(idx);
}

function renderMiniChart(highlightIdx) {
    if (miniChart) { miniChart.destroy(); miniChart = null; }
    if (!parsedData) return;

    const yIdx = parseInt(yAxisSelect.value);
    const xIdx = parseInt(xAxisSelect.value);
    const labels = parsedData.rows.map(r => r[xIdx]);
    const values = parsedData.rows.map(r => parseFloat(r[yIdx]) || 0);

    const bgColors = values.map((_, i) =>
        i === highlightIdx ? 'rgba(79, 70, 229, 0.9)' : 'rgba(79, 70, 229, 0.2)'
    );

    const ctx = $('detail-mini-chart').getContext('2d');
    miniChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels, datasets: [{ data: values, backgroundColor: bgColors, borderRadius: 3, borderSkipped: false }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: true } },
            scales: {
                x: { display: false },
                y: { display: false, beginAtZero: true }
            }
        }
    });
}

// ════════════════════════════════════════════════════════════
// 15. Chart.js 2D 차트 (라이트 테마 최적화)
// ════════════════════════════════════════════════════════════
const COLORS = [
    'rgba(79, 70, 229, 0.85)', 'rgba(236, 72, 153, 0.85)', 'rgba(16, 185, 129, 0.85)',
    'rgba(245, 158, 11, 0.85)', 'rgba(124, 58, 237, 0.85)', 'rgba(14, 165, 233, 0.85)',
    'rgba(239, 68, 68, 0.85)', 'rgba(34, 197, 94, 0.85)', 'rgba(168, 85, 247, 0.85)'
];
const BORDERS = COLORS.map(c => c.replace('0.85)', '1)'));

if (window.Chart) {
    Chart.defaults.font.family = "'Pretendard', -apple-system, BlinkMacSystemFont, 'Malgun Gothic', '맑은 고딕', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
}

function updateFilterSummary(displayed, total) {
    if (!filterSummaryBadge) return;
    const pct = total > 0 ? Math.round((displayed / total) * 100) : 100;
    filterSummaryBadge.innerHTML = `📊 표시: <strong>${displayed.toLocaleString()}</strong>개 / 전체 ${total.toLocaleString()}개 (${pct}%)`;
}

function getFilteredRows() {
    if (!parsedData) return [];
    let rows = [...parsedData.rows];
    const xIdx = parseInt(xAxisSelect.value);
    const yIdx = parseInt(yAxisSelect.value);

    // 1. 키워드 검색 필터
    const kw = filterKeyword ? filterKeyword.value.trim().toLowerCase() : '';
    if (kw) {
        rows = rows.filter(r => {
            const labelText = String(r[xIdx] || '').toLowerCase();
            return labelText.includes(kw);
        });
    }

    // 2. 카테고리 필터
    const fv = dataFilter.value;
    if (fv !== 'all') rows = rows.filter(r => r[xIdx] === fv);

    // 3. 수치 범위 필터
    const rMin = rangeMin.value !== '' ? parseFloat(rangeMin.value) : -Infinity;
    const rMax = rangeMax.value !== '' ? parseFloat(rangeMax.value) : Infinity;
    if (rMin !== -Infinity || rMax !== Infinity) {
        rows = rows.filter(r => {
            const v = parseFloat(r[yIdx]);
            return !isNaN(v) && v >= rMin && v <= rMax;
        });
    }

    // 4. 정렬
    const sort = sortSelect.value;
    if (sort === 'asc') rows.sort((a, b) => (parseFloat(a[yIdx]) || 0) - (parseFloat(b[yIdx]) || 0));
    else if (sort === 'desc') rows.sort((a, b) => (parseFloat(b[yIdx]) || 0) - (parseFloat(a[yIdx]) || 0));

    // 5. 표시 데이터 개수 제한 (Top N / 대용량 데이터 필터)
    const limitVal = limitSelect ? limitSelect.value : 'all';
    if (limitVal !== 'all') {
        const lim = parseInt(limitVal);
        if (!isNaN(lim) && lim > 0) {
            rows = rows.slice(0, lim);
        }
    }

    // 6. 필터 상태 요약 배지 업데이트
    updateFilterSummary(rows.length, parsedData.rows.length);

    return rows;
}

function render2DChart() {
    if (!parsedData || !analysisResult) return;
    const xIdx = parseInt(xAxisSelect.value);
    const yIdx = parseInt(yAxisSelect.value);
    const rows = getFilteredRows();

    const labels = rows.map(r => r[xIdx]);
    const values = rows.map(r => parseFloat(r[yIdx]) || 0);

    // 현재 변경된 데이터 옵션(X축, Y축, 행 개수, 데이터 타입) 기반 동적 추천 산출
    const dynamicRecs = getDynamicRecommendations(labels, values, analysisResult);

    let chartType = chartTypeSelect.value;
    if (chartType === 'auto') {
        // 선택된 데이터의 최적 2D 차트 추천 자동 선택
        const valid2DTypes = ['bar', 'horizontalBar', 'line', 'pie', 'doughnut', 'scatter', 'radar', 'polarArea'];
        const matchedRec = dynamicRecs.find(r => {
            const mapped = r.type === 'donut' ? 'doughnut' : r.type;
            return valid2DTypes.includes(mapped);
        });
        chartType = matchedRec ? (matchedRec.type === 'donut' ? 'doughnut' : matchedRec.type) : 'bar';
    }

    if (chart2d) { chart2d.destroy(); chart2d = null; }
    chartPanel.style.display = '';

    const canvas = $('chart-2d');
    const ctx = canvas.getContext('2d');
    const typeLabels = { bar:'막대', horizontalBar:'가로 막대', line:'선', pie:'파이', doughnut:'도넛', scatter:'산점도', radar:'레이더', polarArea:'폴라 에어리어' };
    chartTitle.textContent = `${typeLabels[chartType] || chartType} — ${parsedData.headers[yIdx]}`;

    const themePalette = values.map((_, i) => '#' + getThemeColor(i, values.length).getHexString());
    const primaryThemeColor = themePalette[0] || '#4f46e5';

    if (chartType === 'scatter' && analysisResult.numericCols.length >= 2) {
        const xN = analysisResult.numericCols[0], yN = analysisResult.numericCols[1];
        chart2d = new Chart(ctx, {
            type: 'scatter',
            data: { datasets: [{ label: `${parsedData.headers[xN]} vs ${parsedData.headers[yN]}`, data: rows.map(r => ({ x: parseFloat(r[xN]) || 0, y: parseFloat(r[yN]) || 0 })), backgroundColor: primaryThemeColor, pointRadius: 6, pointHoverRadius: 10 }] },
            options: chartOptions(chartType, parsedData.headers[xN], parsedData.headers[yN])
        });
    } else {
        const actualType = chartType === 'horizontalBar' ? 'bar' : chartType;
        const isPie = ['pie', 'doughnut', 'polarArea'].includes(chartType);
        const ds = {
            label: parsedData.headers[yIdx], data: values,
            backgroundColor: isPie ? themePalette : primaryThemeColor,
            borderColor: isPie ? themePalette : primaryThemeColor,
            borderWidth: 2, fill: chartType === 'line' ? 'origin' : undefined,
            tension: chartType === 'line' ? 0.4 : undefined,
            pointRadius: chartType === 'line' ? 4 : undefined,
            borderRadius: chartType === 'bar' || chartType === 'horizontalBar' ? 4 : undefined,
        };
        const cfg = { type: actualType, data: { labels, datasets: [ds] }, options: chartOptions(chartType, parsedData.headers[xIdx], parsedData.headers[yIdx]) };
        if (chartType === 'horizontalBar') cfg.options.indexAxis = 'y';
        chart2d = new Chart(ctx, cfg);
    }

    render3DVisualization(labels, values);
    renderDataTable(parsedData);
    updateDynamicRecommendations(labels, values, analysisResult);
}

function chartOptions(type, xLabel, yLabel) {
    const isPie = ['pie', 'doughnut', 'polarArea'].includes(type);
    return {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 600, easing: 'easeOutQuart' },
        plugins: {
            legend: { display: isPie, position: 'right', labels: { color: '#334155', font: { size: 10 }, padding: 6 } },
            tooltip: { backgroundColor: 'rgba(255, 255, 255, 0.95)', titleColor: '#4338ca', bodyColor: '#1e293b', borderColor: '#cbd5e1', borderWidth: 1, padding: 10, cornerRadius: 8 }
        },
        scales: isPie ? {} : {
            x: { title: { display: true, text: xLabel, color: '#64748b', font: { size: 11 } }, ticks: { color: '#64748b', maxRotation: 45, font: { size: 9 } }, grid: { color: '#f1f5f9' } },
            y: { title: { display: true, text: yLabel, color: '#64748b', font: { size: 11 } }, ticks: { color: '#64748b', font: { size: 9 } }, grid: { color: '#f1f5f9' }, beginAtZero: true }
        }
    };
}

function applyVisualization() {
    render2DChart();
    if (analysisResult) {
        renderAIInsights(analysisResult);
        updateTimePlayerUI();
    }
}

// ════════════════════════════════════════════════════════════
// 17. 이벤트 리스너 & 파일 로더 (CSV 및 엑셀 .xlsx, .xls 완벽 지원)
// ════════════════════════════════════════════════════════════
/**
 * 로컬 파일(CSV 또는 엑셀 .xlsx, .xls)을 ArrayBuffer로 읽어들여 파싱 및 시각화 파이프라인 구동
 * - SheetJS(XLSX) 라이브러리를 통한 첫 번째 시트 자동 변환
 * - CSV의 경우 decodeCSVBuffer(EUC-KR/UTF-8 자동 감지)를 통한 무변환 디코딩
 * @param {File} file - 업로드된 File 객체
 */
function loadAndParseCSVFile(file) {
    if (!file) return;
    currentUploadedFile = file;
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    fileNameDisplay.textContent = `📄 ${file.name} (${isExcel ? '엑셀 / Excel' : 'CSV'} - ${(file.size / 1024).toFixed(1)} KB)`;
    statusIndicator.textContent = '● 로딩 중... / Loading...';
    statusIndicator.className = 'status loading';

    const encodingMode = csvEncodingSelect ? csvEncodingSelect.value : 'auto';
    const reader = new FileReader();
    reader.onload = evt => {
        try {
            const buffer = evt.target.result;
            let text = '';
            let sheetInfo = '';

            // 1. 엑셀 파일인 경우 SheetJS를 사용하여 CSV 문자열로 메모리상 즉시 변환
            if (isExcel && window.XLSX) {
                const workbook = window.XLSX.read(buffer, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                text = window.XLSX.utils.sheet_to_csv(worksheet);
                sheetInfo = ` [시트: ${sheetName}]`;
                showToast(`📊 엑셀 파일 로드 완료: <strong>${file.name}</strong> (${sheetName} 시트)`);
            } else {
                // 2. CSV 파일인 경우 한글 인코딩 자동 감지 디코더 사용
                text = decodeCSVBuffer(buffer, encodingMode);
            }

            parsedData = parseCSV(text);
            if (!parsedData) {
                statusIndicator.textContent = '● 파싱 실패 / Parsing Failed';
                statusIndicator.className = 'status offline';
                return;
            }
            fileNameDisplay.textContent = `📄 ${file.name}${sheetInfo} (${isExcel ? '엑셀 / Excel' : 'CSV'} - ${(file.size / 1024).toFixed(1)} KB)`;
            processData(`📄 ${file.name}${sheetInfo}`);
        } catch (err) {
            console.error('파일 읽기/파싱 에러:', err);
            statusIndicator.textContent = '● 파일 읽기 에러 / Read Error';
            statusIndicator.className = 'status offline';
        }
    };
    reader.onerror = () => {
        statusIndicator.textContent = '● 파일 읽기 실패 / File Read Error';
        statusIndicator.className = 'status offline';
    };
    reader.readAsArrayBuffer(file);
}

csvUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    loadAndParseCSVFile(file);
});

if (csvEncodingSelect) {
    csvEncodingSelect.addEventListener('change', () => {
        if (currentUploadedFile) {
            loadAndParseCSVFile(currentUploadedFile);
        }
    });
}

function processData(sourceName) {
    analysisResult = analyzeData(parsedData);
    displayAnalysis(analysisResult);
    updateAxisSelectors(analysisResult);
    renderDataTable(parsedData);
    initTimePlayer();
    applyVisualization();

    statusIndicator.textContent = `● ${sourceName}`;
    statusIndicator.className = 'status online';

    // 메뉴 패널 열고 시각화 설정 아코디언 열기
    if (menuPanel) menuPanel.classList.add('open');
    openAccordionSection('viz-section');
}

// 메뉴 드로어 토글
btnToggleMenu?.addEventListener('click', () => {
    if (menuPanel) menuPanel.classList.toggle('open');
});
btnCloseMenu?.addEventListener('click', () => {
    if (menuPanel) menuPanel.classList.remove('open');
});

// 자동 추천 토글 및 즉시 적용 버튼
autoRecommendToggle?.addEventListener('change', () => {
    const isAuto = autoRecommendToggle.checked;
    if (autoRecommendStatusBadge) {
        autoRecommendStatusBadge.textContent = isAuto ? 'ON (자동)' : 'OFF (수동)';
        autoRecommendStatusBadge.className = isAuto ? 'badge-auto-on' : 'badge-auto-off';
    }
    if (appliedRecommendNotice) {
        appliedRecommendNotice.textContent = isAuto
            ? '선택한 데이터에 맞춰 3D 및 2D 시각화가 최적으로 자동 적용됩니다.'
            : '수동 설정 모드입니다. 원하는 3D 형태와 2D 차트를 직접 지정하세요.';
    }
});

btnForceRecommend?.addEventListener('click', () => {
    if (!parsedData || !analysisResult) return;
    const xIdx = parseInt(xAxisSelect.value);
    const yIdx = parseInt(yAxisSelect.value);
    const rows = getFilteredRows();
    const labels = rows.map(r => r[xIdx]);
    const values = rows.map(r => parseFloat(r[yIdx]) || 0);
    const best3D = inferBest3DStyle(labels, values, analysisResult);
    if (barStyleSelect) barStyleSelect.value = best3D;
    const recs = getDynamicRecommendations(labels, values, analysisResult);
    const valid2DTypes = ['bar', 'horizontalBar', 'line', 'pie', 'doughnut', 'scatter', 'radar', 'polarArea'];
    const matched2D = recs.find(r => valid2DTypes.includes(r.type === 'donut' ? 'doughnut' : r.type));
    if (matched2D && chartTypeSelect) {
        chartTypeSelect.value = matched2D.type === 'donut' ? 'doughnut' : matched2D.type;
    }
    applyVisualization();
});

chartTypeSelect.addEventListener('change', () => { if (parsedData) applyVisualization(); });

// X축 또는 Y축 옵션을 변경할 때마다 즉시 실시간 맞춤 시각화 추천 및 화면 갱신
xAxisSelect.addEventListener('change', () => {
    if (!parsedData) return;
    updateFilter(parseInt(xAxisSelect.value));
    applyVisualization();
});
yAxisSelect.addEventListener('change', () => {
    if (!parsedData) return;
    applyVisualization();
});

applyBtn.addEventListener('click', () => {
    if (!parsedData) return;
    updateFilter(parseInt(xAxisSelect.value));
    applyVisualization();
});
dataFilter.addEventListener('change', () => { if (parsedData) applyVisualization(); });
btnApplyRange.addEventListener('click', () => { if (parsedData) applyVisualization(); });
sortSelect.addEventListener('change', () => { if (parsedData) applyVisualization(); });
filterKeyword?.addEventListener('input', () => { if (parsedData) applyVisualization(); });
limitSelect?.addEventListener('change', () => { if (parsedData) applyVisualization(); });

btnFilterTop10?.addEventListener('click', () => {
    if (limitSelect) limitSelect.value = '10';
    if (sortSelect) sortSelect.value = 'desc';
    if (parsedData) applyVisualization();
});

btnFilterAboveAvg?.addEventListener('click', () => {
    if (!analysisResult || !parsedData) return;
    const yIdx = parseInt(yAxisSelect.value);
    const colName = parsedData.headers[yIdx];
    const stats = analysisResult.numericStats[colName];
    if (stats && stats.mean !== undefined) {
        rangeMin.value = Math.round(stats.mean);
        rangeMax.value = '';
        applyVisualization();
    }
});

btnFilterTop20pct?.addEventListener('click', () => {
    if (!parsedData) return;
    const yIdx = parseInt(yAxisSelect.value);
    const vals = parsedData.rows.map(r => parseFloat(r[yIdx]) || 0).filter(v => !isNaN(v)).sort((a, b) => a - b);
    if (vals.length) {
        const p80 = vals[Math.floor(vals.length * 0.8)];
        rangeMin.value = Math.round(p80);
        rangeMax.value = '';
        applyVisualization();
    }
});

btnFilterAll?.addEventListener('click', () => {
    if (filterKeyword) filterKeyword.value = '';
    if (dataFilter) dataFilter.value = 'all';
    if (rangeMin) rangeMin.value = '';
    if (rangeMax) rangeMax.value = '';
    if (limitSelect) limitSelect.value = (parsedData && parsedData.rows.length > 30) ? '30' : 'all';
    if (sortSelect) sortSelect.value = 'none';
    if (parsedData) applyVisualization();
});

chartCloseBtn.addEventListener('click', () => { chartPanel.style.display = 'none'; });
chartMaxBtn.addEventListener('click', () => { chartPanel.classList.toggle('maximized'); if (chart2d) chart2d.resize(); });

// ════════════════════════════════════════════════════════════
// 17. 차세대 렌더 루프 및 실시간 FPS 성능 모니터링
// ════════════════════════════════════════════════════════════
const clock = new THREE.Clock();
let frameCount = 0;
let lastFpsTime = performance.now();

function animate() {
    requestAnimationFrame(animate);
    const frameStartTime = performance.now();
    const dt = clock.getDelta();

    dataObjects.forEach(obj => {
        const isHovered = obj === hoveredObject || obj === selectedObject;
        const targetScale = isHovered ? 1.08 : 1.0;
        obj.scale.x += (targetScale - obj.scale.x) * 5 * dt;
        obj.scale.z += (targetScale - obj.scale.z) * 5 * dt;
    });

// ════════════════════════════════════════════════════════════
// 18. 차세대 렌더 루프 (requestAnimationFrame) 및 실시간 60FPS 성능 모니터링
// ════════════════════════════════════════════════════════════
/**
 * 매 프레임마다 실행되는 Three.js 메인 렌더 루프
 * - 마우스 호버 스케일업 애니메이션 부드러운 보간 (Lerp)
 * - OrbitControls 카메라 감쇠 업데이트
 * - 3D ↔ 2D 라벨 투영 좌표 동기화 (syncLabelsToScreen)
 * - 실시간 FPS 프레임레이트 및 Frame Time(ms) 측정
 */
function animate() {
    const frameStartTime = performance.now();
    requestAnimationFrame(animate);

    const dt = clock.getDelta();

    // 호버된 개체의 부드러운 스케일업 애니메이션 (Lerp 보간)
    dataObjects.forEach(obj => {
        const isHovered = (obj === hoveredObject);
        const targetScale = isHovered ? 1.08 : 1.0;
        obj.scale.x += (targetScale - obj.scale.x) * 5 * dt;
        obj.scale.y += (targetScale - obj.scale.y) * 5 * dt;
        obj.scale.z += (targetScale - obj.scale.z) * 5 * dt;
    });

    updateCameraAnim();
    controls.update();
    syncLabelsToScreen();
    renderer.render(scene, camera);

    // 실시간 FPS 및 렌더링 지연시간(ms) 측정 (1초 간격 갱신)
    frameCount++;
    const now = performance.now();
    const elapsed = now - lastFpsTime;
    if (elapsed >= 1000) {
        gpuEngineState.fps = Math.round((frameCount * 1000) / elapsed);
        gpuEngineState.frameTimeMs = Math.max(0.1, (now - frameStartTime)).toFixed(1);
        frameCount = 0;
        lastFpsTime = now;

        if (gpuInfoModal && gpuInfoModal.style.display !== 'none' && modalGpuFps) {
            modalGpuFps.textContent = `${gpuEngineState.fps} FPS (${gpuEngineState.frameTimeMs} ms)`;
        }
    }
}

// 윈도우 창 크기 변경 시 카메라 비율 및 렌더러 해상도 자동 동기화
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// 모바일 터치 디바이스 레이캐스팅 터치 지원
renderer.domElement.addEventListener('touchstart', e => {
    const t = e.touches[0];
    onPointerMove({ clientX: t.clientX, clientY: t.clientY });
}, { passive: true });

// 렌더링 엔진 루프 최초 시작
animate();
