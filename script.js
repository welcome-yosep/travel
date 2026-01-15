// 데이터 저장소
let plannedTrips = JSON.parse(localStorage.getItem('plannedTrips') || '[]');
let completedTrips = JSON.parse(localStorage.getItem('completedTrips') || '[]');

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

// 새 여행 추가
document.getElementById('add-trip-btn').addEventListener('click', function() {
    const newTrip = {
        id: Date.now(),
        title: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        type: 'domestic',
        accommodation: { name: '', address: '', phone: '', notes: '' },
        flight: { airline: '', departure: { number: '', time: '' }, arrival: { number: '', time: '' } },
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
                <input type="text" placeholder="숙소명" value="${trip.accommodation.name}" onchange="updateAccommodation(${trip.id}, 'name', this.value)">
                <input type="text" placeholder="주소" value="${trip.accommodation.address}" onchange="updateAccommodation(${trip.id}, 'address', this.value)">
                <input type="text" placeholder="연락처" value="${trip.accommodation.phone}" onchange="updateAccommodation(${trip.id}, 'phone', this.value)">
                <textarea placeholder="추가 정보" onchange="updateAccommodation(${trip.id}, 'notes', this.value)">${trip.accommodation.notes}</textarea>
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

function updateAccommodation(tripId, field, value) {
    const trip = plannedTrips.find(t => t.id === tripId);
    if (trip) {
        trip.accommodation[field] = value;
        savePlannedTrips();
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

    if (trip.accommodation.name) {
        html += `
            <div class="detail-section">
                <h4>숙소 정보</h4>
                <p><strong>숙소명:</strong> ${trip.accommodation.name}</p>
                ${trip.accommodation.address ? `<p><strong>주소:</strong> ${trip.accommodation.address}</p>` : ''}
                ${trip.accommodation.phone ? `<p><strong>연락처:</strong> ${trip.accommodation.phone}</p>` : ''}
                ${trip.accommodation.notes ? `<p><strong>추가 정보:</strong> ${trip.accommodation.notes}</p>` : ''}
            </div>
        `;
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
