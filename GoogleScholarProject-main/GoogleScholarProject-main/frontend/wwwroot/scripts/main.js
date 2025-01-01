let academicsData = []; // Global değişken

document.addEventListener('DOMContentLoaded', function() {
    // SVG'yi yükle
    fetch('assets/turkey-map.svg')
        .then(response => response.text())
        .then(svgContent => {
            document.getElementById('turkey-map').innerHTML = svgContent;
            setupEventListeners();
            addElazigLabel();
        });
});

// Elazığ etiketi ekleme fonksiyonu
function addElazigLabel() {
    const svg = document.querySelector('#turkey-map svg');
    const elazigPath = document.querySelector('path[id="TR23"]');
    
    if (svg && elazigPath) {
        const svgNS = "http://www.w3.org/2000/svg";
        
        // Grup elementi oluştur
        const group = document.createElementNS(svgNS, "g");
        group.setAttribute("class", "elazig-group");
        
        // Mevcut path'i gruba taşı
        const parent = elazigPath.parentNode;
        parent.removeChild(elazigPath);
        group.appendChild(elazigPath);
        
        // Text elementi oluştur
        const text = document.createElementNS(svgNS, "text");
        text.setAttribute("class", "city-label");
        text.textContent = "ELAZIĞ";
        text.setAttribute("x", "686.5");
        text.setAttribute("y", "236.8");
        
        // Text'i de gruba ekle
        group.appendChild(text);
        
        // Grubu SVG'ye ekle
        parent.appendChild(group);
    }
}

function setupEventListeners() {
    // Elazığ ili için tıklama olayı
    const elazig = document.querySelector('path[id="TR23"]');
    if (elazig) {
        elazig.addEventListener('click', function() {
            openModal();
        });
    }

    // Modal kapatma butonu için event listener
    const closeButton = document.querySelector('.close-button');
    if (closeButton) {
        closeButton.addEventListener('click', closeModal);
    }
}

function openModal() {
    const modal = document.getElementById('universityModal');
    if (modal) {
        modal.style.display = 'block';
        // Modal açıldığında butonları gizle
        document.getElementById('facultyButton').style.display = 'none';
        document.getElementById('departmentButton').style.display = 'none';
    }
}

function closeModal() {
    const modal = document.getElementById('universityModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function showFacultyButton() {
    const facultyButton = document.getElementById('facultyButton');
    if (facultyButton) {
        facultyButton.style.display = 'block';
    }
}

function showDepartmentButton() {
    const departmentButton = document.getElementById('departmentButton');
    if (departmentButton) {
        departmentButton.style.display = 'block';
        // Butona tıklama olayı ekle
        departmentButton.onclick = fetchAcademicData;
    }
}

function createFilterSection() {
    const filterSection = document.createElement('div');
    filterSection.className = 'filter-section';
    filterSection.innerHTML = `
        <div class="filter-header">
            <h2 class="filter-title">
                <i class="fas fa-users"></i>
                Akademisyen Listesi
                <span class="academics-count">${academicsData.length}</span>
            </h2>
        </div>
        <div class="controls-wrapper">
            <div class="search-wrapper">
                <div class="search-container">
                    <input type="text" 
                           id="searchAcademics" 
                           placeholder="Akademisyen Ara..."
                           onkeyup="searchAcademics(this.value)"
                           autocomplete="off">
                    <i class="fas fa-search search-icon"></i>
                    <div class="search-animation"></div>
                </div>
            </div>
            <div class="sort-wrapper">
                <div class="sort-container">
                    <select id="sortBy" onchange="sortAcademics(this.value)">
                        <option value="default">Sıralama Kriteri</option>
                        <option value="atif">En Çok Atıf</option>
                        <option value="h_indeks">En Yüksek H-İndeks</option>
                        <option value="i10_indeks">En Yüksek i10-İndeks</option>
                    </select>
                    <i class="fas fa-sort-amount-down sort-icon"></i>
                </div>
            </div>
        </div>
        <div class="search-results-info"></div>
    `;
    return filterSection;
}

function sortAcademics(criteria) {
    const container = document.querySelector('.academics-container');
    
    // Filtreleme bölümü hariç tüm içeriği temizle
    while (container.lastChild && container.lastChild.className !== 'filter-section') {
        container.removeChild(container.lastChild);
    }

    // Seçilen kritere göre sırala
    let sortedAcademics = [...academicsData];
    
    switch(criteria) {
        case 'atif':
            sortedAcademics.sort((a, b) => {
                const atifA = parseInt(a.Atif?.replace(/,/g, '') || '0');
                const atifB = parseInt(b.Atif?.replace(/,/g, '') || '0');
                return atifB - atifA;
            });
            break;
        case 'h_indeks':
            sortedAcademics.sort((a, b) => {
                const hA = parseInt(a.h_indeks?.replace(/,/g, '') || '0');
                const hB = parseInt(b.h_indeks?.replace(/,/g, '') || '0');
                return hB - hA;
            });
            break;
        case 'i10_indeks':
            sortedAcademics.sort((a, b) => {
                const i10A = parseInt(a.i10_indeks?.replace(/,/g, '') || '0');
                const i10B = parseInt(b.i10_indeks?.replace(/,/g, '') || '0');
                return i10B - i10A;
            });
            break;
    }

    // Sıralanmış akademisyenleri göster
    sortedAcademics.forEach(academic => {
        const academicCard = createAcademicCard(academic);
        container.appendChild(academicCard);
    });
}

function fetchAcademicData() {
    const modal = document.getElementById('academicModal');
    const container = document.querySelector('.academics-container');
    
    container.innerHTML = `
        <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Akademisyen verileri yükleniyor...</p>
        </div>
    `;
    
    modal.style.display = 'block';

    fetch('/api/academics')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Tekrarlanan verileri temizle
            const uniqueAcademics = removeDuplicates(data);
            academicsData = uniqueAcademics; // Global değişkene kaydet
            
            container.innerHTML = ''; // Loading göstergesini kaldır
            container.appendChild(createFilterSection());
            
            if (uniqueAcademics.length > 0) {
                uniqueAcademics.forEach(academic => {
                    const academicCard = createAcademicCard(academic);
                    container.appendChild(academicCard);
                });
            }
        })
        .catch(error => {
            console.error('Veri çekme hatası:', error);
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Veriler yüklenirken bir hata oluştu: ${error.message}</p>
                </div>
            `;
        });
}

// Tekrarlanan verileri temizleme fonksiyonu
function removeDuplicates(data) {
    const seen = new Set();
    return data.filter(item => {
        const key = item.Ad_Soyad; // Ad_Soyad'a göre tekrarları kontrol et
        if (!seen.has(key)) {
            seen.add(key);
            return true;
        }
        return false;
    });
}

function displayAcademicData(academics) {
    const container = document.querySelector('.academics-container');
    container.innerHTML = ''; // Mevcut içeriği temizle

    academics.forEach(academic => {
        const academicCard = createAcademicCard(academic);
        container.appendChild(academicCard);
    });
}

function createAcademicCard(academic) {
    const card = document.createElement('div');
    card.className = 'academic-card';
    
    card.innerHTML = `
        <div class="academic-profile" onclick="togglePublications(this)">
            <div class="profile-content">
                <div class="profile-left">
                    <div class="avatar">
                        <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%231e3c72'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E" alt="User Avatar" class="avatar-image">
                    </div>
                    <div class="profile-info">
                        <h3 class="academic-name">${academic.Ad_Soyad || 'İsimsiz'}</h3>
                    </div>
                </div>
                
                <div class="metrics-container">
                    <div class="metric">
                        <div class="metric-icon">
                            <i class="fas fa-quote-right"></i>
                        </div>
                        <div class="metric-details">
                            <span class="metric-value">${academic.Atif || '0'}</span>
                            <span class="metric-label">Atıf</span>
                        </div>
                    </div>
                    <div class="metric">
                        <div class="metric-icon">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <div class="metric-details">
                            <span class="metric-value">${academic.h_indeks || '0'}</span>
                            <span class="metric-label">h-indeks</span>
                        </div>
                    </div>
                    <div class="metric">
                        <div class="metric-icon">
                            <i class="fas fa-chart-bar"></i>
                        </div>
                        <div class="metric-details">
                            <span class="metric-value">${academic.i10_indeks || '0'}</span>
                            <span class="metric-label">i10-indeks</span>
                        </div>
                    </div>
                </div>

                <div class="research-areas">
                    <i class="fas fa-spinner fa-spin"></i> Araştırma alanları analiz ediliyor...
                </div>
                
                <div class="toggle-icon">
                    <i class="fas fa-chevron-down"></i>
                </div>
            </div>
        </div>

        <div class="publications-section" style="display: none;">
            <div class="publications-list">
                ${(academic.makaleler || []).map((makale, index) => `
                    <div class="publication-item">
                        <div class="publication-number">${index + 1}</div>
                        <div class="publication-content">
                            <h5 class="publication-title">${makale.baslik || 'Başlıksız'}</h5>
                            <p class="publication-authors">${makale.yazarlar || 'Yazar bilgisi yok'}</p>
                            <div class="publication-meta">
                                <span class="pub-year">
                                    <i class="far fa-calendar-alt"></i>
                                    ${makale.yil || 'Yıl belirtilmemiş'}
                                </span>
                                <span class="pub-citations">
                                    <i class="fas fa-quote-right"></i>
                                    ${makale.atif_sayisi || '0'} atıf
                                </span>
                            </div>
                            <div class="publication-venue">
                                <i class="fas fa-book"></i>
                                ${makale.yayin_yeri || 'Yayın yeri belirtilmemiş'}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    // ID'yi kontrol etmek için log ekleyelim
    console.log('Academic data:', academic);
    
    // ID'yi doğru şekilde al
    const academicId = academic._id || academic.Id || academic.id;
    
    // Araştırma alanlarını getir
    if (academicId) {
        fetchResearchAreas(academicId, card);
    } else {
        console.error('Academic ID not found:', academic);
    }
    
    return card;
}

// Araştırma alanlarını getiren yeni fonksiyon
async function fetchResearchAreas(academicId, card) {
    try {
        console.log('Fetching research areas for:', academicId);
        
        // API çağrısı öncesi ID kontrolü
        if (!academicId) {
            throw new Error('Geçersiz akademisyen ID');
        }

        const response = await fetch(`/api/academic/research-areas/${academicId}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', {
                status: response.status,
                statusText: response.statusText,
                error: errorText
            });
            throw new Error(`API Hatası: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('API Response:', data);
        
        const researchAreasDiv = card.querySelector('.research-areas');
        if (!data.researchAreas) {
            throw new Error('API yanıtında research areas bulunamadı');
        }
        
        researchAreasDiv.innerHTML = `
            <div class="research-areas-content">
                <i class="fas fa-microscope"></i>
                <span>${data.researchAreas}</span>
            </div>
        `;
    } catch (error) {
        console.error('Error fetching research areas:', error);
        const researchAreasDiv = card.querySelector('.research-areas');
        researchAreasDiv.innerHTML = `
            <div class="research-areas-error">
                <i class="fas fa-exclamation-circle"></i>
                <span>Araştırma alanları analiz edilemedi: ${error.message}</span>
            </div>
        `;
    }
}

function togglePublications(element) {
    const card = element.closest('.academic-card');
    const publicationsSection = card.querySelector('.publications-section');
    const toggleIcon = card.querySelector('.toggle-icon i');
    
    // Diğer tüm açık kartları kapat
    document.querySelectorAll('.academic-card').forEach(otherCard => {
        if (otherCard !== card) {
            const otherPublications = otherCard.querySelector('.publications-section');
            const otherIcon = otherCard.querySelector('.toggle-icon i');
            otherPublications.style.display = 'none';
            otherIcon.className = 'fas fa-chevron-down';
            otherCard.querySelector('.academic-profile').classList.remove('active');
        }
    });
    
    if (publicationsSection.style.display === 'none') {
        publicationsSection.style.display = 'block';
        toggleIcon.className = 'fas fa-chevron-up';
        element.classList.add('active');
    } else {
        publicationsSection.style.display = 'none';
        toggleIcon.className = 'fas fa-chevron-down';
        element.classList.remove('active');
    }
}

function openAcademicModal() {
    const modal = document.getElementById('academicModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeAcademicModal() {
    const modal = document.getElementById('academicModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Modal dışına tıklandığında kapatma
window.onclick = function(event) {
    const modal = document.getElementById('universityModal');
    if (event.target == modal) {
        modal.style.display = 'none';
    }
}

// Arama fonksiyonu ekleyelim
function searchAcademics(searchTerm) {
    const container = document.querySelector('.academics-container');
    const cards = container.querySelectorAll('.academic-card');
    const searchInfo = container.querySelector('.search-results-info');
    const searchAnimation = container.querySelector('.search-animation');
    
    searchTerm = searchTerm.toLowerCase().trim();
    let matchCount = 0;
    
    // Arama animasyonunu başlat
    searchAnimation.style.width = '100%';
    
    // Küçük bir gecikme ile arama yap
    setTimeout(() => {
        cards.forEach(card => {
            const academicName = card.querySelector('.academic-name').textContent.toLowerCase();
            if (academicName.includes(searchTerm)) {
                card.style.display = '';
                card.style.animation = 'fadeInUp 0.5s ease-out';
                matchCount++;
            } else {
                card.style.display = 'none';
            }
        });

        // Arama sonuçlarını göster
        if (searchTerm) {
            searchInfo.textContent = `${matchCount} akademisyen bulundu`;
            searchInfo.style.display = 'block';
            searchInfo.style.animation = 'fadeIn 0.3s ease-out';
        } else {
            searchInfo.style.display = 'none';
        }

        // Arama animasyonunu sıfırla
        searchAnimation.style.width = '0%';
    }, 300);
}

// Akademisyenin durumuna göre renk sınıfı belirleme
function getStatusClass(academic) {
    const atif = parseInt(academic.Atif) || 0;
    if (atif > 1000) return 'status-high';
    if (atif > 500) return 'status-medium';
    return 'status-normal';
} 