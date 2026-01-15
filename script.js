// 데이터 저장소
let plannedTrips = JSON.parse(localStorage.getItem('plannedTrips') || '[]');
let completedTrips = JSON.parse(localStorage.getItem('completedTrips') || '[]');

// GitHub 설정
let githubConfig = JSON.parse(localStorage.getItem('githubConfig') || '{}');
const DATA_FILE_NAME = 'travel-data.json';

// 메뉴 전환
document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', function() {
        document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
        this.classList.add('active');

        const page = this.dataset.page;
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(`${page}-page`).classList.add('active');

        if (page === 'history') {
            loadCompletedTrips();
        }
    });
});

// GitHub 설정 모달
document.getElementById('settings-btn').addEventListener('click', function() {
    const modal = document.getElementById('settings-modal');

    // 저장된 설정 불러오기
    document.getElementById('github-username').value = githubConfig.username || '';
    document.getElementById('github-repo').value = githubConfig.repo || '';
    document.getElementById('github-token').value = githubConfig.token || '';

    modal.classList.add('show');
});

function closeSettingsModal() {
    document.getElementById('settings-modal').classList.remove('show');
}

function saveGitHubSettings() {
    const username = document.getElementById('github-username').value.trim();
    const repo = document.getElementById('github-repo').value.trim();
    const token = document.getElementById('github-token').value.trim();

    if (!username || !repo || !token) {
        alert('모든 항목을 입력해주세요.');
        return;
    }

    githubConfig = { username, repo, token };
    localStorage.setItem('githubConfig', JSON.stringify(githubConfig));

    alert('설정이 저장되었습니다!');
    closeSettingsModal();
}

// 데이터 업로드 (GitHub에 푸시)
document.getElementById('upload-btn').addEventListener('click', async function() {
    if (!githubConfig.username || !githubConfig.repo || !githubConfig.token) {
        alert('먼저 GitHub 설정을 완료해주세요. (⚙️ 설정 버튼 클릭)');
        return;
    }

    if (!confirm('현재 데이터를 GitHub에 업로드하시겠습니까?')) {
        return;
    }

    try {
        const data = {
            plannedTrips,
            completedTrips,
            lastUpdated: new Date().toISOString()
        };

        await uploadToGitHub(data);
        alert('데이터가 성공적으로 업로드되었습니다!');
    } catch (error) {
        console.error('업로드 오류:', error);
        alert('업로드 중 오류가 발생했습니다: ' + error.message);
    }
});

// 동기화 (GitHub에서 다운로드)
document.getElementById('sync-btn').addEventListener('click', async function() {
    if (!githubConfig.username || !githubConfig.repo || !githubConfig.token) {
        alert('먼저 GitHub 설정을 완료해주세요. (⚙️ 설정 버튼 클릭)');
        return;
    }

    try {
        const data = await downloadFromGitHub();

        if (confirm('GitHub에서 최신 데이터를 가져오시겠습니까?\n현재 데이터는 덮어씌워집니다.')) {
            plannedTrips = data.plannedTrips || [];
            completedTrips = data.completedTrips || [];
            savePlannedTrips();
            saveCompletedTrips();
            renderPlannedTrips();
            alert('동기화가 완료되었습니다!');
        }
    } catch (error) {
        console.error('동기화 오류:', error);
        alert('동기화 중 오류가 발생했습니다: ' + error.message);
    }
});

// GitHub API - 파일 업로드
async function uploadToGitHub(data) {
    const { username, repo, token } = githubConfig;
    const apiUrl = `https://api.github.com/repos/${username}/${repo}/contents/${DATA_FILE_NAME}`;

    const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));

    // 기존 파일 SHA 가져오기 (업데이트를 위해 필요)
    let sha = null;
    try {
        const getResponse = await fetch(apiUrl, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        if (getResponse.ok) {
            const fileData = await getResponse.json();
            sha = fileData.sha;
        }
    } catch (error) {
        // 파일이 없는 경우 무시
    }

    const body = {
        message: `Update travel data - ${new Date().toLocaleString('ko-KR')}`,
        content: content,
        branch: 'main'
    };

    if (sha) {
        body.sha = sha;
    }

    const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '업로드 실패');
    }

    return await response.json();
}

// GitHub API - 파일 다운로드
async function downloadFromGitHub() {
    const { username, repo, token } = githubConfig;
    const apiUrl = `https://api.github.com/repos/${username}/${repo}/contents/${DATA_FILE_NAME}`;

    const response = await fetch(apiUrl, {
        headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    });

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error('GitHub에 데이터 파일이 없습니다. 먼저 "데이터 업로드"를 해주세요.');
        }
        const error = await response.json();
        throw new Error(error.message || '다운로드 실패');
    }

    const fileData = await response.json();
    const content = decodeURIComponent(escape(atob(fileData.content)));

    return JSON.parse(content);
}

// 새 여행 추가
document.getElementById('add-trip-btn').addEventListener('click', function() {
    const newTrip = {
        id: Date.now(),
        title: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        type: 'domestic',
        accommodations: [{ name: '', address: '', phone: '', notes: '' }],
        flight: { airline: '', departure: { number: '', time: '' }, arrival: { number: '', time: '' } },
        preparations: [],
        dailySchedules: []
    };

    plannedTrips.push(newTrip);
    savePlannedTrips();
    renderPlannedTrips();
});

// 여행 계획 렌더링
function renderPlannedTrips() {
    const container = document.getElementById('trip-plans-list');

    if (plannedTrips.length === 0) {
        container.innerHTML = '<p class="empty-message">새 여행을 추가해보세요!</p>';
        return;
    }

    container.innerHTML = '';
    plannedTrips.forEach(trip => {
        const card = createTripCard(trip);
        container.appendChild(card);
    });
}

// 여행 카드 생성
function createTripCard(trip) {
    const card = document.createElement('div');
    card.className = 'trip-plan-card';
    card.dataset.tripId = trip.id;

    const typeText = trip.type === 'domestic' ? '국내' : '해외';
    const title = trip.title || '제목 없음';

    card.innerHTML = `
        <div class="trip-card-header">
            <div class="trip-card-info">
                <div class="trip-card-title">${title}</div>
                <div class="trip-card-meta">
                    <span>${trip.startDate} ~ ${trip.endDate}</span>
                    <span>${typeText}</span>
                </div>
            </div>
            <div class="trip-card-actions">
                <button class="btn-complete" onclick="completeTrip(${trip.id})">완료</button>
                <button class="btn-delete" onclick="deletePlannedTrip(${trip.id})">삭제</button>
            </div>
            <span class="expand-arrow">▼</span>
        </div>
        <div class="trip-card-details">
            <div class="trip-details-content">
                ${createTripForm(trip)}
            </div>
        </div>
    `;

    // 헤더 클릭으로 펼치기/접기
    const header = card.querySelector('.trip-card-header');
    const details = card.querySelector('.trip-card-details');

    header.addEventListener('click', function(e) {
        // 버튼 클릭 시에는 펼치기/접기 동작 안함
        if (e.target.tagName === 'BUTTON') return;

        this.classList.toggle('expanded');
        details.classList.toggle('show');
    });

    return card;
}

// 여행 폼 생성
function createTripForm(trip) {
    return `
        <div class="form-group">
            <label>여행 계획 제목</label>
            <input type="text" value="${trip.title}" onchange="updateTrip(${trip.id}, 'title', this.value)">
        </div>

        <div class="form-group">
            <label>여행 기간</label>
            <div class="date-range">
                <input type="date" value="${trip.startDate}" onchange="updateTripDate(${trip.id}, 'startDate', this.value)">
                <span>~</span>
                <input type="date" value="${trip.endDate}" onchange="updateTripDate(${trip.id}, 'endDate', this.value)">
            </div>
        </div>

        <div class="form-group">
            <label>여행 유형</label>
            <div class="radio-group">
                <label class="radio-label">
                    <input type="radio" name="trip-type-${trip.id}" value="domestic" ${trip.type === 'domestic' ? 'checked' : ''} onchange="updateTrip(${trip.id}, 'type', 'domestic')">
                    <span>국내</span>
                </label>
                <label class="radio-label">
                    <input type="radio" name="trip-type-${trip.id}" value="overseas" ${trip.type === 'overseas' ? 'checked' : ''} onchange="updateTrip(${trip.id}, 'type', 'overseas')">
                    <span>해외</span>
                </label>
            </div>
        </div>

        <div class="form-group">
            <button class="btn-toggle" onclick="toggleSection(event, 'accommodation-${trip.id}')">
                <span>숙소 예약</span>
                <span class="arrow">▼</span>
            </button>
            <div class="collapse-content" id="accommodation-${trip.id}">
                <div id="accommodations-${trip.id}">
                    ${renderAccommodations(trip)}
                </div>
                <button class="btn-add-item" onclick="addAccommodation(${trip.id})">+ 숙소 추가</button>
            </div>
        </div>

        <div class="form-group">
            <button class="btn-toggle" onclick="toggleSection(event, 'preparation-${trip.id}')">
                <span>준비물</span>
                <span class="arrow">▼</span>
            </button>
            <div class="collapse-content" id="preparation-${trip.id}">
                <div id="preparations-${trip.id}">
                    ${renderPreparations(trip)}
                </div>
                <button class="btn-add-item" onclick="addPreparation(${trip.id})">+ 준비물 추가</button>
            </div>
        </div>

        ${trip.type === 'overseas' ? `
        <div class="form-group">
            <button class="btn-toggle" onclick="toggleSection(event, 'flight-${trip.id}')">
                <span>비행기 예약</span>
                <span class="arrow">▼</span>
            </button>
            <div class="collapse-content" id="flight-${trip.id}">
                <input type="text" placeholder="항공사" value="${trip.flight.airline}" onchange="updateFlight(${trip.id}, 'airline', this.value)">
                <div class="flight-details">
                    <div>
                        <label>출발편</label>
                        <input type="text" placeholder="편명" value="${trip.flight.departure.number}" onchange="updateFlightDetail(${trip.id}, 'departure', 'number', this.value)">
                        <input type="datetime-local" value="${trip.flight.departure.time}" onchange="updateFlightDetail(${trip.id}, 'departure', 'time', this.value)">
                    </div>
                    <div>
                        <label>도착편</label>
                        <input type="text" placeholder="편명" value="${trip.flight.arrival.number}" onchange="updateFlightDetail(${trip.id}, 'arrival', 'number', this.value)">
                        <input type="datetime-local" value="${trip.flight.arrival.time}" onchange="updateFlightDetail(${trip.id}, 'arrival', 'time', this.value)">
                    </div>
                </div>
            </div>
        </div>
        ` : ''}

        <div class="form-group">
            <button class="btn-toggle" onclick="toggleSection(event, 'schedule-${trip.id}')">
                <span>상세 일정</span>
                <span class="arrow">▼</span>
            </button>
            <div class="collapse-content" id="schedule-${trip.id}">
                <div id="daily-schedules-${trip.id}">
                    ${renderDailySchedules(trip)}
                </div>
            </div>
        </div>
    `;
}

// 일별 일정 렌더링
function renderDailySchedules(trip) {
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    let html = '';
    let currentDate = new Date(start);
    let dayCount = 1;

    while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const date = new Date(dateStr);
        const dateFormatted = `${date.getMonth() + 1}월 ${date.getDate()}일`;

        const daySchedule = trip.dailySchedules.find(d => d.date === dateStr) || { date: dateStr, schedules: [{ time: '09:00', description: '' }] };

        html += `
            <div class="daily-schedule" data-date="${dateStr}">
                <h4>Day ${dayCount} (${dateFormatted})</h4>
                <div class="schedule-items">
                    ${daySchedule.schedules.map((schedule, idx) => `
                        <div class="schedule-item">
                            <input type="time" value="${schedule.time}" onchange="updateSchedule(${trip.id}, '${dateStr}', ${idx}, 'time', this.value)">
                            <input type="text" placeholder="일정을 입력하세요" value="${schedule.description}" onchange="updateSchedule(${trip.id}, '${dateStr}', ${idx}, 'description', this.value)">
                            <button onclick="removeSchedule(${trip.id}, '${dateStr}', ${idx})">삭제</button>
                        </div>
                    `).join('')}
                </div>
                <button class="btn-add-schedule" onclick="addSchedule(${trip.id}, '${dateStr}')">+ 일정 추가</button>
            </div>
        `;

        currentDate.setDate(currentDate.getDate() + 1);
        dayCount++;
    }

    return html || '<p>날짜를 선택하면 일정을 추가할 수 있습니다.</p>';
}

// 숙소 렌더링
function renderAccommodations(trip) {
    if (!trip.accommodations) {
        trip.accommodations = [{ name: '', address: '', phone: '', notes: '' }];
    }

    return trip.accommodations.map((acc, idx) => `
        <div class="accommodation-card">
            <div class="accommodation-card-header">
                <span class="accommodation-card-title">숙소 ${idx + 1}</span>
                ${trip.accommodations.length > 1 ? `<button class="btn-remove-accommodation" onclick="removeAccommodation(${trip.id}, ${idx})">삭제</button>` : ''}
            </div>
            <input type="text" placeholder="숙소명" value="${acc.name || ''}" onchange="updateAccommodationField(${trip.id}, ${idx}, 'name', this.value)">
            <input type="text" placeholder="주소" value="${acc.address || ''}" onchange="updateAccommodationField(${trip.id}, ${idx}, 'address', this.value)">
            <input type="text" placeholder="연락처" value="${acc.phone || ''}" onchange="updateAccommodationField(${trip.id}, ${idx}, 'phone', this.value)">
            <textarea placeholder="추가 정보" onchange="updateAccommodationField(${trip.id}, ${idx}, 'notes', this.value)">${acc.notes || ''}</textarea>
        </div>
    `).join('');
}

function addAccommodation(tripId) {
    const trip = plannedTrips.find(t => t.id === tripId);
    if (trip) {
        if (!trip.accommodations) trip.accommodations = [];
        trip.accommodations.push({ name: '', address: '', phone: '', notes: '' });
        savePlannedTrips();

        const accommodationsDiv = document.getElementById(`accommodations-${tripId}`);
        accommodationsDiv.innerHTML = renderAccommodations(trip);
    }
}

function removeAccommodation(tripId, accIdx) {
    const trip = plannedTrips.find(t => t.id === tripId);
    if (trip && trip.accommodations && trip.accommodations.length > 1) {
        trip.accommodations.splice(accIdx, 1);
        savePlannedTrips();

        const accommodationsDiv = document.getElementById(`accommodations-${tripId}`);
        accommodationsDiv.innerHTML = renderAccommodations(trip);
    }
}

function updateAccommodationField(tripId, accIdx, field, value) {
    const trip = plannedTrips.find(t => t.id === tripId);
    if (trip && trip.accommodations && trip.accommodations[accIdx]) {
        trip.accommodations[accIdx][field] = value;
        savePlannedTrips();
    }
}

// 준비물 렌더링
function renderPreparations(trip) {
    if (!trip.preparations) {
        trip.preparations = [];
    }

    if (trip.preparations.length === 0) {
        return '<p style="color: #999; text-align: center; padding: 10px;">준비물을 추가해주세요.</p>';
    }

    return trip.preparations.map((prep, idx) => `
        <div class="preparation-item ${prep.completed ? 'completed' : ''}">
            <input type="checkbox" ${prep.completed ? 'checked' : ''} onchange="togglePreparation(${trip.id}, ${idx})">
            <input type="text" placeholder="준비물 입력" value="${prep.item || ''}" onchange="updatePreparation(${trip.id}, ${idx}, this.value)">
            <button onclick="removePreparation(${trip.id}, ${idx})">삭제</button>
        </div>
    `).join('');
}

function addPreparation(tripId) {
    const trip = plannedTrips.find(t => t.id === tripId);
    if (trip) {
        if (!trip.preparations) trip.preparations = [];
        trip.preparations.push({ item: '', completed: false });
        savePlannedTrips();

        const preparationsDiv = document.getElementById(`preparations-${tripId}`);
        preparationsDiv.innerHTML = renderPreparations(trip);
    }
}

function removePreparation(tripId, prepIdx) {
    const trip = plannedTrips.find(t => t.id === tripId);
    if (trip && trip.preparations) {
        trip.preparations.splice(prepIdx, 1);
        savePlannedTrips();

        const preparationsDiv = document.getElementById(`preparations-${tripId}`);
        preparationsDiv.innerHTML = renderPreparations(trip);
    }
}

function updatePreparation(tripId, prepIdx, value) {
    const trip = plannedTrips.find(t => t.id === tripId);
    if (trip && trip.preparations && trip.preparations[prepIdx]) {
        trip.preparations[prepIdx].item = value;
        savePlannedTrips();
    }
}

function togglePreparation(tripId, prepIdx) {
    const trip = plannedTrips.find(t => t.id === tripId);
    if (trip && trip.preparations && trip.preparations[prepIdx]) {
        trip.preparations[prepIdx].completed = !trip.preparations[prepIdx].completed;
        savePlannedTrips();

        const preparationsDiv = document.getElementById(`preparations-${tripId}`);
        preparationsDiv.innerHTML = renderPreparations(trip);
    }
}

// 섹션 토글
function toggleSection(event, sectionId) {
    event.stopPropagation();
    const btn = event.currentTarget;
    const content = document.getElementById(sectionId);
    btn.classList.toggle('active');
    content.classList.toggle('show');
}

// 여행 정보 업데이트
function updateTrip(tripId, field, value) {
    const trip = plannedTrips.find(t => t.id === tripId);
    if (trip) {
        trip[field] = value;
        savePlannedTrips();

        // 제목 변경 시 헤더의 제목도 업데이트
        if (field === 'title') {
            const card = document.querySelector(`[data-trip-id="${tripId}"]`);
            if (card) {
                const titleElement = card.querySelector('.trip-card-title');
                if (titleElement) {
                    titleElement.textContent = value || '제목 없음';
                }
            }
        }

        // 유형 변경 시 전체 재렌더링
        if (field === 'type') {
            renderPlannedTrips();
        }
    }
}

function updateTripDate(tripId, field, value) {
    const trip = plannedTrips.find(t => t.id === tripId);
    if (trip) {
        trip[field] = value;
        savePlannedTrips();

        // 날짜 변경 시 일정 재생성
        const scheduleContainer = document.getElementById(`schedule-${tripId}`);
        if (scheduleContainer && scheduleContainer.classList.contains('show')) {
            const dailySchedulesDiv = document.getElementById(`daily-schedules-${tripId}`);
            dailySchedulesDiv.innerHTML = renderDailySchedules(trip);
        }
    }
}

function updateFlight(tripId, field, value) {
    const trip = plannedTrips.find(t => t.id === tripId);
    if (trip) {
        trip.flight[field] = value;
        savePlannedTrips();
    }
}

function updateFlightDetail(tripId, type, field, value) {
    const trip = plannedTrips.find(t => t.id === tripId);
    if (trip) {
        trip.flight[type][field] = value;
        savePlannedTrips();
    }
}

// 일정 관리
function updateSchedule(tripId, dateStr, scheduleIdx, field, value) {
    const trip = plannedTrips.find(t => t.id === tripId);
    if (trip) {
        let daySchedule = trip.dailySchedules.find(d => d.date === dateStr);
        if (!daySchedule) {
            daySchedule = { date: dateStr, schedules: [] };
            trip.dailySchedules.push(daySchedule);
        }

        if (!daySchedule.schedules[scheduleIdx]) {
            daySchedule.schedules[scheduleIdx] = { time: '09:00', description: '' };
        }

        daySchedule.schedules[scheduleIdx][field] = value;
        savePlannedTrips();
    }
}

function addSchedule(tripId, dateStr) {
    const trip = plannedTrips.find(t => t.id === tripId);
    if (trip) {
        let daySchedule = trip.dailySchedules.find(d => d.date === dateStr);
        if (!daySchedule) {
            daySchedule = { date: dateStr, schedules: [] };
            trip.dailySchedules.push(daySchedule);
        }

        daySchedule.schedules.push({ time: '12:00', description: '' });
        savePlannedTrips();

        // 일정 재렌더링
        const dailySchedulesDiv = document.getElementById(`daily-schedules-${tripId}`);
        dailySchedulesDiv.innerHTML = renderDailySchedules(trip);
    }
}

function removeSchedule(tripId, dateStr, scheduleIdx) {
    const trip = plannedTrips.find(t => t.id === tripId);
    if (trip) {
        const daySchedule = trip.dailySchedules.find(d => d.date === dateStr);
        if (daySchedule && daySchedule.schedules.length > 1) {
            daySchedule.schedules.splice(scheduleIdx, 1);
            savePlannedTrips();

            // 일정 재렌더링
            const dailySchedulesDiv = document.getElementById(`daily-schedules-${tripId}`);
            dailySchedulesDiv.innerHTML = renderDailySchedules(trip);
        } else {
            alert('최소 1개의 일정은 필요합니다.');
        }
    }
}

// 여행 완료
function completeTrip(tripId) {
    const trip = plannedTrips.find(t => t.id === tripId);
    if (trip) {
        if (confirm(`"${trip.title || '제목 없음'}" 여행을 완료하시겠습니까?`)) {
            plannedTrips = plannedTrips.filter(t => t.id !== tripId);
            completedTrips.push(trip);
            savePlannedTrips();
            saveCompletedTrips();
            renderPlannedTrips();
        }
    }
}

// 계획 중인 여행 삭제
function deletePlannedTrip(tripId) {
    const trip = plannedTrips.find(t => t.id === tripId);
    if (trip) {
        if (confirm(`"${trip.title || '제목 없음'}" 여행을 삭제하시겠습니까?`)) {
            plannedTrips = plannedTrips.filter(t => t.id !== tripId);
            savePlannedTrips();
            renderPlannedTrips();
        }
    }
}

// 완료된 여행 렌더링
function loadCompletedTrips() {
    const container = document.getElementById('completed-trips-list');

    if (completedTrips.length === 0) {
        container.innerHTML = '<p class="empty-message">아직 다녀온 여행이 없습니다.</p>';
        return;
    }

    container.innerHTML = '';
    completedTrips.forEach(trip => {
        const card = createCompletedTripCard(trip);
        container.appendChild(card);
    });
}

function createCompletedTripCard(trip) {
    const card = document.createElement('div');
    card.className = 'completed-trip-card';

    const typeText = trip.type === 'domestic' ? '국내' : '해외';

    card.innerHTML = `
        <div class="completed-trip-info">
            <h3>${trip.title || '제목 없음'}</h3>
            <p><strong>기간:</strong> ${trip.startDate} ~ ${trip.endDate}</p>
            <p><strong>유형:</strong> ${typeText}</p>
        </div>
        <div class="completed-trip-actions">
            <button class="btn-view" onclick="viewTripDetail(${trip.id})">상세보기</button>
            <button class="btn-delete" onclick="deleteCompletedTrip(${trip.id})">삭제</button>
        </div>
    `;

    return card;
}

// 여행 상세보기
function viewTripDetail(tripId) {
    const trip = completedTrips.find(t => t.id === tripId);
    if (!trip) return;

    const modal = document.getElementById('detail-modal');
    const modalBody = document.getElementById('modal-body');

    let html = `<h3>${trip.title || '제목 없음'}</h3>`;

    html += `
        <div class="detail-section">
            <h4>여행 정보</h4>
            <p><strong>기간:</strong> ${trip.startDate} ~ ${trip.endDate}</p>
            <p><strong>유형:</strong> ${trip.type === 'domestic' ? '국내' : '해외'}</p>
        </div>
    `;

    if (trip.accommodations && trip.accommodations.length > 0) {
        html += `<div class="detail-section"><h4>숙소 정보</h4>`;
        trip.accommodations.forEach((acc, idx) => {
            if (acc.name) {
                html += `<p><strong>숙소 ${idx + 1}:</strong> ${acc.name}</p>`;
                if (acc.address) html += `<p style="margin-left: 20px;">주소: ${acc.address}</p>`;
                if (acc.phone) html += `<p style="margin-left: 20px;">연락처: ${acc.phone}</p>`;
                if (acc.notes) html += `<p style="margin-left: 20px;">메모: ${acc.notes}</p>`;
            }
        });
        html += `</div>`;
    }

    if (trip.preparations && trip.preparations.length > 0) {
        html += `<div class="detail-section"><h4>준비물</h4>`;
        trip.preparations.forEach(prep => {
            if (prep.item) {
                const checkmark = prep.completed ? '✓' : '○';
                html += `<p>${checkmark} ${prep.item}</p>`;
            }
        });
        html += `</div>`;
    }

    if (trip.type === 'overseas' && trip.flight.airline) {
        html += `
            <div class="detail-section">
                <h4>비행기 정보</h4>
                <p><strong>항공사:</strong> ${trip.flight.airline}</p>
                ${trip.flight.departure.number ? `
                    <p><strong>출발편:</strong> ${trip.flight.departure.number}
                    ${trip.flight.departure.time ? `(${new Date(trip.flight.departure.time).toLocaleString('ko-KR')})` : ''}</p>
                ` : ''}
                ${trip.flight.arrival.number ? `
                    <p><strong>도착편:</strong> ${trip.flight.arrival.number}
                    ${trip.flight.arrival.time ? `(${new Date(trip.flight.arrival.time).toLocaleString('ko-KR')})` : ''}</p>
                ` : ''}
            </div>
        `;
    }

    if (trip.dailySchedules.length > 0) {
        html += `<div class="detail-section"><h4>상세 일정</h4>`;

        trip.dailySchedules.forEach((daySchedule, idx) => {
            const date = new Date(daySchedule.date);
            const dateFormatted = `${date.getMonth() + 1}월 ${date.getDate()}일`;

            html += `<p><strong>Day ${idx + 1} (${dateFormatted}):</strong></p>`;

            daySchedule.schedules.forEach(schedule => {
                if (schedule.description.trim()) {
                    html += `<p>- ${schedule.time} ${schedule.description}</p>`;
                }
            });
        });

        html += `</div>`;
    }

    modalBody.innerHTML = html;
    modal.classList.add('show');
}

// 완료된 여행 삭제
function deleteCompletedTrip(tripId) {
    const trip = completedTrips.find(t => t.id === tripId);
    if (trip) {
        if (confirm(`"${trip.title || '제목 없음'}" 여행을 삭제하시겠습니까?`)) {
            completedTrips = completedTrips.filter(t => t.id !== tripId);
            saveCompletedTrips();
            loadCompletedTrips();
        }
    }
}

// 모달 닫기
document.querySelector('.modal-close').addEventListener('click', function() {
    document.getElementById('detail-modal').classList.remove('show');
});

document.getElementById('detail-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        this.classList.remove('show');
    }
});

// 로컬 스토리지 저장
function savePlannedTrips() {
    localStorage.setItem('plannedTrips', JSON.stringify(plannedTrips));
}

function saveCompletedTrips() {
    localStorage.setItem('completedTrips', JSON.stringify(completedTrips));
}

// 초기 렌더링
renderPlannedTrips();
