// ==========================================
// 1. ตั้งค่า FIREBASE CONFIG (เอาค่าจาก Firebase Console มาวางตรงนี้)
// ==========================================
const firebaseConfig = {
 apiKey: "AIzaSyDpzIYhZZ26Sb1k2WboIZ3PIBY5i4BrRYE",

  authDomain: "booking-app-48d69.firebaseapp.com",

  projectId: "booking-app-48d69",

  storageBucket: "booking-app-48d69.firebasestorage.app",

  messagingSenderId: "37104067254",

  appId: "1:37104067254:web:e23e75297db0defcb4bc17",

  measurementId: "G-CVPP07KLGV"

};

// เริ่มต้นใช้งาน Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ==========================================
// 2. ตัวแปรสำหรับจัดการ STATE ของแอปพลิเคชัน
// ==========================================
// เก็บข้อมูลบทบาทที่ผู้ใช้เลือกในปัจจุบัน: { "2026-10-02": "staff", "2026-10-03": "nurse" }
let userSelections = {};

// เก็บข้อมูลสถิติการจองจริงจาก Firestore: { "2026-10-02": { staff_count: 2, has_nurse: true } }
let dailyData = {};

// วันในสัปดาห์ภาษาไทย
const thaiDays = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

// ==========================================
// 3. INITIALIZATION & REAL-TIME LISTENER
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  // เริ่มต้นดึงข้อมูล Real-time จาก Firestore คอลเลกชัน 'daily_slots'
  listenToDailySlots();
});

// ฟังการเปลี่ยนแปลงข้อมูลใน Firestore แบบ Real-time
function listenToDailySlots() {
  db.collection('daily_slots').onSnapshot((snapshot) => {
    dailyData = {};
    snapshot.forEach((doc) => {
      dailyData[doc.id] = doc.data();
    });
    // วาดปฏิทินใหม่ทุกครั้งที่มีข้อมูลอัปเดต
    renderCalendar();
    updateSummary();
  }, (error) => {
    console.error("Error loading daily slots: ", error);
  });
}

// ==========================================
// 4. FUNCTION วาดปฏิทิน (2 - 26 ตุลาคม 2569)
// ==========================================
function renderCalendar() {
  const calendarGrid = document.getElementById('calendarGrid');
  if (!calendarGrid) return;

  calendarGrid.innerHTML = '';

  // วนลูปสร้างการ์ดวันที่ 2 ถึง 26 ตุลาคม 2569 (ค.ศ. 2026)
  for (let day = 2; day <= 26; day++) {
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    const dateKey = `2026-10-${dayStr}`; // Format: YYYY-MM-DD
    
    // คำนวณวันในสัปดาห์ (ปี 2026 เดือนตุลาคม วันที่ 1 ตรงกับวันพฤหัสบดี)
    const dateObj = new Date(2026, 9, day); // Month Index 9 = ตุลาคม
    const dayName = thaiDays[dateObj.getDay()];

    // ดึงข้อมูลการจองประจำวันจาก Firestore State
    const dayInfo = dailyData[dateKey] || { staff_count: 0, has_nurse: false };
    const staffCount = dayInfo.staff_count || 0;
    const isNurseFull = dayInfo.has_nurse || false;

    // บทบาทที่ผู้ใช้ปัจจุบันเลือกในวันนี้นั้นๆ
    const currentSelectedRole = userSelections[dateKey];

    // สร้างการ์ดประจำวัน
    const card = document.createElement('div');
    card.className = `date-card ${currentSelectedRole ? 'selected' : ''}`;
    card.id = `card-${dateKey}`;

    card.innerHTML = `
      <div class="date-header">
        <span class="day-name">${dayName}</span>
        <span class="day-number">${day} ต.ค.</span>
      </div>

      <div class="slot-status">
        <div class="status-item">
          <span>สตาฟ:</span>
          <strong>${staffCount} คน</strong>
        </div>
        <div class="status-item">
          <span>พยาบาล:</span>
          <strong class="${isNurseFull ? 'text-full' : 'text-available'}">
            ${isNurseFull ? 'เต็มแล้ว' : 'ว่าง (1)'}
          </strong>
        </div>
      </div>

      <div class="role-actions">
        <button 
          type="button"
          class="btn-role btn-staff ${currentSelectedRole === 'staff' ? 'active' : ''}" 
          onclick="selectRole('${dateKey}', 'staff')"
        >
          สตาฟ
        </button>
        <button 
          type="button"
          class="btn-role btn-nurse ${currentSelectedRole === 'nurse' ? 'active' : ''} ${isNurseFull && currentSelectedRole !== 'nurse' ? 'disabled' : ''}" 
          ${isNurseFull && currentSelectedRole !== 'nurse' ? 'disabled' : ''}
          onclick="selectRole('${dateKey}', 'nurse')"
        >
          ${isNurseFull && currentSelectedRole !== 'nurse' ? 'พยาบาล (เต็ม)' : 'พยาบาล'}
        </button>
      </div>
    `;

    calendarGrid.appendChild(card);
  }
}

// ==========================================
// 5. FUNCTION การเลือก/ยกเลิก บทบาทในแต่ละวัน
// ==========================================
function selectRole(dateStr, role) {
  // หากคลิกเลือกปุ่มบทบาทเดิมซ้ำ -> ถือเป็นการ "ยกเลิก" การเลือกวันนั้น
  if (userSelections[dateStr] === role) {
    removeSelection(dateStr);
  } else {
    // บันทึกบทบาทลงในวันที่เลือก (ทับบทบาทเดิมทันที ป้องกันการเลือก 2 บทบาทในวันเดียว)
    userSelections[dateStr] = role;
    renderCalendar();
    updateSummary();
  }
}

// ฟังก์ชันสำหรับลบวันออกจากรายการที่เลือก
function removeSelection(dateStr) {
  if (userSelections[dateStr]) {
    delete userSelections[dateStr];
    renderCalendar();
    updateSummary();
  }
}

// ==========================================
// 6. FUNCTION อัปเดต UI ส่วนสรุปรายการจอง (พร้อมปุ่มลบรายการ)
// ==========================================
function updateSummary() {
  const selectedDates = Object.keys(userSelections).sort();
  const count = selectedDates.length;

  const countEl = document.getElementById('selectedCount');
  const listEl = document.getElementById('selectedList');
  const submitBtn = document.getElementById('submitBtn');

  if (countEl) countEl.innerText = count;

  // ตรวจสอบเงื่อนไข: ต้องเลือกอย่างน้อย 3 วันขึ้นไป ปุ่มบันทึกถึงจะเปิดใช้งาน
  if (submitBtn) {
    submitBtn.disabled = count < 3;
  }

  if (!listEl) return;

  if (count === 0) {
    listEl.innerHTML = '<li class="empty-state">ยังไม่ได้เลือกวันใดๆ กรุณาคลิกเลือกบทบาทในปฏิทิน</li>';
    return;
  }

  // สร้างรายการวันที่เลือกเพื่อแสดงในหน้าสรุป พร้อมปุ่มลบ (❌)
  listEl.innerHTML = selectedDates.map(dateKey => {
    const dayNum = parseInt(dateKey.split('-')[2], 10);
    const roleText = userSelections[dateKey] === 'nurse' ? 'พยาบาล' : 'สตาฟ';
    const roleBadgeClass = userSelections[dateKey] === 'nurse' ? 'badge-nurse' : 'badge-staff';

    return `
      <li class="summary-item">
        <div class="summary-info">
          <span>วันที่ ${dayNum} ตุลาคม 2569</span>
          <span class="summary-badge ${roleBadgeClass}">${roleText}</span>
        </div>
        <button type="button" class="btn-remove" onclick="removeSelection('${dateKey}')" title="ลบรายการนี้">
          ✕
        </button>
      </li>
    `;
  }).join('');
}

// ==========================================
// 7. FUNCTION บันทึกข้อมูลการจองลง FIREBASE (พร้อมกล่องยืนยันการจอง)
// ==========================================
async function submitBooking() {
  const nameInput = document.getElementById('userName');
  const contactInput = document.getElementById('userContact');

  const name = nameInput ? nameInput.value.trim() : '';
  const contact = contactInput ? contactInput.value.trim() : '';

  // 1. Validation Check
  if (!name || !contact) {
    alert("กรุณากรอกชื่อ-นามสกุล และช่องทางติดต่อให้ครบถ้วน");
    return;
  }

  const selectedDates = Object.keys(userSelections);
  if (selectedDates.length < 3) {
    alert("กรุณาเลือกวันเข้าซ้อมอย่างน้อย 3 วันขึ้นไป");
    return;
  }

  // 2. ถามยืนยันก่อนทำการบันทึกข้อมูล (Confirmation Dialog)
  const confirmText = `ยืนยันการจองคิวเข้าซ้อมสำหรับคุณ "${name}"\nจำนวนทั้งหมด ${selectedDates.length} วัน ใช่หรือไม่?`;
  const isConfirmed = confirm(confirmText);
  if (!isConfirmed) {
    return; // ถ้านักเรียนกด "ยกเลิก" จะหยุดการทำงานทันที
  }

  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerText = "กำลังบันทึกข้อมูล...";
  }

  try {
    // 3. สร้าง Record บันทึกประวัติการจองลง Collection 'bookings'
    const bookingPayload = {
      user_name: name,
      contact: contact,
      total_days: selectedDates.length,
      created_at: firebase.firestore.FieldValue.serverTimestamp(),
      schedules: selectedDates.map(dateKey => ({
        date: dateKey,
        role: userSelections[dateKey]
      }))
    };

    await db.collection('bookings').add(bookingPayload);

    // 4. อัปเดตสถิติจำนวนคนลง Collection 'daily_slots' สำหรับแต่ละวันที่เลือก
    for (const dateKey of selectedDates) {
      const role = userSelections[dateKey];
      const slotRef = db.collection('daily_slots').doc(dateKey);

      if (role === 'nurse') {
        await slotRef.set({
          date: dateKey,
          has_nurse: true,
          nurse_name: name
        }, { merge: true });
      } else {
        await slotRef.set({
          date: dateKey,
          staff_count: firebase.firestore.FieldValue.increment(1)
        }, { merge: true });
      }
    }

    alert("🎉 บันทึกการจองคิวสำเร็จเรียบร้อยแล้ว!");
    
    // Reset Form
    userSelections = {};
    if (nameInput) nameInput.value = '';
    if (contactInput) contactInput.value = '';
    
    renderCalendar();
    updateSummary();

  } catch (error) {
    console.error("Error saving booking: ", error);
    alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง");
  } finally {
    if (submitBtn) {
      submitBtn.innerText = "ยืนยันการจองคิว";
    }
  }
}