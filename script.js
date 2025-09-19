// ================= GLOBAL STATE ================= 
let currentTheme = localStorage.getItem('agrosmartai-ui-theme') || 'light';
let currentVideoIndex = 0;
let allPlants = [];
let filteredPlants = [];
let currentPlantModal = null;
let chartInstance = null;
let visiblePlantsCount = 8;
let currentViewMode = 'grid';

// ================= UTILITY FUNCTIONS =================
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showToast(title, description, type = 'success') {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    toast.innerHTML = `
        <div class="toast-title">${title}</div>
        <div class="toast-description">${description}</div>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
    }
}

function formatNumber(num) {
    if (num >= 1000) {
        return Math.floor(num / 1000) + 'K+';
    }
    return num + '+';
}

// ================= API FUNCTIONS =================
async function fetchFromAPI(endpoint, options = {}) {
    try {
        const response = await fetch(`/api${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

async function uploadImageForDiagnosis(file) {
    const formData = new FormData();
    formData.append('image', file);
    
    try {
        const response = await fetch('/api/diagnose', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Image upload failed:', error);
        throw error;
    }
}

// ================= THEME MANAGEMENT =================
function initializeTheme() {
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (currentTheme === 'system') {
        currentTheme = systemPrefersDark ? 'dark' : 'light';
    }
    
    document.body.classList.toggle('dark', currentTheme === 'dark');
    updateThemeIcon();
}

function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('agrosmartai-ui-theme', currentTheme);
    document.body.classList.toggle('dark', currentTheme === 'dark');
    updateThemeIcon();
}

function updateThemeIcon() {
    const themeIcon = document.querySelector('.theme-icon');
    if (themeIcon) {
        themeIcon.setAttribute('data-lucide', currentTheme === 'dark' ? 'sun' : 'moon');
        // Reinitialize lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
}

// ================= VIDEO BACKGROUND =================
function initializeVideoBackground() {
    const indicators = document.querySelectorAll('.indicator');
    const prevBtn = document.getElementById('prev-video-btn');
    const nextBtn = document.getElementById('next-video-btn');
    
    function updateVideoIndicators() {
        indicators.forEach((indicator, index) => {
            indicator.classList.toggle('active', index === currentVideoIndex);
        });
    }
    
    function nextVideo() {
        currentVideoIndex = (currentVideoIndex + 1) % 5;
        updateVideoIndicators();
    }
    
    function prevVideo() {
        currentVideoIndex = (currentVideoIndex - 1 + 5) % 5;
        updateVideoIndicators();
    }
    
    if (prevBtn) prevBtn.addEventListener('click', prevVideo);
    if (nextBtn) nextBtn.addEventListener('click', nextVideo);
    
    // Auto-advance video indicators every 10 seconds
    setInterval(nextVideo, 10000);
    
    updateVideoIndicators();
}

// ================= NAVIGATION =================
function initializeNavigation() {
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    const themeToggle = document.getElementById('theme-toggle');
    
    // Mobile menu toggle
    if (mobileMenuToggle && mobileMenu) {
        mobileMenuToggle.addEventListener('click', () => {
            mobileMenu.classList.toggle('show');
        });
    }
    
    // Theme toggle
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Navigation links
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            scrollToSection(targetId);
            
            // Close mobile menu if open
            if (mobileMenu) {
                mobileMenu.classList.remove('show');
            }
        });
    });
    
    // Smooth scroll for programmatic navigation
    window.scrollToSection = scrollToSection;
}

// ================= SEARCH FUNCTIONALITY =================
function initializeSearch() {
    const searchInputs = [
        document.getElementById('search-input'),
        document.getElementById('mobile-search-input'),
        document.getElementById('library-search')
    ];
    
    const debouncedSearch = debounce((query) => {
        filterPlants(query);
    }, 300);
    
    searchInputs.forEach(input => {
        if (input) {
            input.addEventListener('input', (e) => {
                const query = e.target.value;
                // Sync all search inputs
                searchInputs.forEach(otherInput => {
                    if (otherInput && otherInput !== input) {
                        otherInput.value = query;
                    }
                });
                debouncedSearch(query);
            });
        }
    });
}

// ================= STATS LOADING =================
async function loadStats() {
    try {
        const stats = await fetchFromAPI('/stats');
        
        const cropsStat = document.getElementById('stat-crops');
        const diseasesStat = document.getElementById('stat-diseases');
        const accuracyStat = document.getElementById('stat-accuracy');
        const farmersStat = document.getElementById('stat-farmers');
        
        if (cropsStat) cropsStat.textContent = stats.plantsSupported + '+';
        if (diseasesStat) diseasesStat.textContent = stats.diseasesDetected + '+';
        if (accuracyStat) accuracyStat.textContent = stats.accuracy + '%';
        if (farmersStat) farmersStat.textContent = formatNumber(stats.farmersHelped);
        
    } catch (error) {
        console.error('Failed to load stats:', error);
        showToast('Error', 'Failed to load statistics', 'error');
    }
}

// ================= PLANT LIBRARY =================
async function loadPlants() {
    try {
        const plantsGrid = document.getElementById('plants-grid');
        
        // Show loading skeletons
        plantsGrid.innerHTML = `
            <div class="loading-grid">
                ${Array(8).fill('').map(() => '<div class="plant-card-skeleton"></div>').join('')}
            </div>
        `;
        
        allPlants = await fetchFromAPI('/plants');
        filteredPlants = [...allPlants];
        
        // Populate category filter
        populateCategoryFilter();
        
        // Render plants
        renderPlants();
        
    } catch (error) {
        console.error('Failed to load plants:', error);
        showToast('Error', 'Failed to load plant library', 'error');
        
        const plantsGrid = document.getElementById('plants-grid');
        plantsGrid.innerHTML = `
            <div class="no-results">
                <i data-lucide="alert-circle" class="no-results-icon"></i>
                <p>Failed to load plants. Please try again.</p>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}

function populateCategoryFilter() {
    const categoryFilter = document.getElementById('category-filter');
    if (!categoryFilter) return;
    
    const categories = [...new Set(allPlants.map(plant => plant.category))];
    
    // Clear existing options except "All Categories"
    categoryFilter.innerHTML = '<option value="all">All Categories</option>';
    
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.toLowerCase();
        option.textContent = category;
        categoryFilter.appendChild(option);
    });
}

function filterPlants(searchQuery = '', category = 'all') {
    const query = searchQuery.toLowerCase();
    
    filteredPlants = allPlants.filter(plant => {
        const matchesSearch = !query || 
            plant.name.toLowerCase().includes(query) ||
            plant.scientificName.toLowerCase().includes(query) ||
            plant.description.toLowerCase().includes(query) ||
            plant.commonDiseases.some(disease => disease.toLowerCase().includes(query));
        
        const matchesCategory = category === 'all' || 
            plant.category.toLowerCase() === category;
        
        return matchesSearch && matchesCategory;
    });
    
    visiblePlantsCount = 8; // Reset visible count
    renderPlants();
}

function renderPlants() {
    const plantsGrid = document.getElementById('plants-grid');
    const loadMoreContainer = document.getElementById('load-more-container');
    const noResultsMessage = document.getElementById('no-plants-message');
    
    if (!plantsGrid) return;
    
    // Clear grid
    plantsGrid.innerHTML = '';
    
    // Apply view mode class
    plantsGrid.className = currentViewMode === 'grid' ? 'plants-grid' : 'plants-grid list-view';
    
    if (filteredPlants.length === 0) {
        if (noResultsMessage) noResultsMessage.classList.remove('hidden');
        if (loadMoreContainer) loadMoreContainer.classList.add('hidden');
        return;
    }
    
    if (noResultsMessage) noResultsMessage.classList.add('hidden');
    
    const plantsToShow = filteredPlants.slice(0, visiblePlantsCount);
    
    plantsToShow.forEach(plant => {
        const plantCard = createPlantCard(plant);
        plantsGrid.appendChild(plantCard);
    });
    
    // Show/hide load more button
    if (loadMoreContainer) {
        if (visiblePlantsCount < filteredPlants.length) {
            loadMoreContainer.classList.remove('hidden');
        } else {
            loadMoreContainer.classList.add('hidden');
        }
    }
    
    // Reinitialize lucide icons
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function createPlantCard(plant) {
    const card = document.createElement('div');
    card.className = 'plant-card';
    card.setAttribute('data-testid', `card-plant-${plant.id}`);
    
    const categoryClass = getCategoryClass(plant.category);
    
    card.innerHTML = `
        <img src="${plant.imageUrl}" alt="${plant.name}" loading="lazy">
        <div class="plant-card-content">
            <div class="plant-card-header">
                <h3 class="plant-card-title" data-testid="text-plant-name-${plant.id}">${plant.name}</h3>
                <span class="category-badge ${categoryClass}">${plant.category}</span>
            </div>
            <p class="plant-scientific">${plant.scientificName}</p>
            <p class="plant-description">${plant.description}</p>
            <div class="plant-stats">
                <span class="plant-stat">
                    <i data-lucide="thermometer"></i>
                    <span>${plant.temperature}°C</span>
                </span>
                <span class="plant-stat">
                    <i data-lucide="droplets"></i>
                    <span>${plant.humidity}%</span>
                </span>
                <span class="plant-stat">
                    <i data-lucide="sprout"></i>
                    <span>${plant.growthPeriod}</span>
                </span>
            </div>
        </div>
    `;
    
    card.addEventListener('click', () => {
        openPlantModal(plant);
    });
    
    return card;
}

function getCategoryClass(category) {
    switch (category.toLowerCase()) {
        case 'grain': return 'grain';
        case 'vegetable': return 'vegetable';
        case 'fruit': return 'fruit';
        case 'legume': return 'legume';
        case 'industrial': return 'industrial';
        default: return '';
    }
}

// ================= PLANT LIBRARY CONTROLS =================
function initializePlantLibraryControls() {
    const categoryFilter = document.getElementById('category-filter');
    const gridViewBtn = document.getElementById('grid-view-btn');
    const listViewBtn = document.getElementById('list-view-btn');
    const loadMoreBtn = document.getElementById('load-more-btn');
    
    // Category filter
    if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
            const searchInput = document.getElementById('library-search');
            const searchQuery = searchInput ? searchInput.value : '';
            filterPlants(searchQuery, e.target.value);
        });
    }
    
    // View mode buttons
    if (gridViewBtn && listViewBtn) {
        gridViewBtn.addEventListener('click', () => {
            currentViewMode = 'grid';
            gridViewBtn.classList.add('active');
            listViewBtn.classList.remove('active');
            renderPlants();
        });
        
        listViewBtn.addEventListener('click', () => {
            currentViewMode = 'list';
            listViewBtn.classList.add('active');
            gridViewBtn.classList.remove('active');
            renderPlants();
        });
    }
    
    // Load more button
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            visiblePlantsCount += 8;
            renderPlants();
        });
    }
}

// ================= PLANT MODAL =================
function openPlantModal(plant) {
    currentPlantModal = plant;
    const modal = document.getElementById('plant-modal');
    
    if (!modal) return;
    
    // Populate modal content
    populateModalContent(plant);
    
    // Show modal
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // Create chart
    createPlantChart(plant);
}

function closeModal() {
    const modal = document.getElementById('plant-modal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
    
    // Destroy chart
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
    
    currentPlantModal = null;
}

function populateModalContent(plant) {
    // Basic info
    const modalPlantName = document.getElementById('modal-plant-name');
    const modalPlantScientific = document.getElementById('modal-plant-scientific');
    const modalPlantImage = document.getElementById('modal-plant-image');
    
    if (modalPlantName) modalPlantName.textContent = plant.name;
    if (modalPlantScientific) modalPlantScientific.textContent = plant.scientificName;
    if (modalPlantImage) {
        modalPlantImage.src = plant.imageUrl;
        modalPlantImage.alt = plant.name;
    }
    
    // Plant information
    const modalScientificName = document.getElementById('modal-scientific-name');
    const modalFamily = document.getElementById('modal-family');
    const modalOrigin = document.getElementById('modal-origin');
    const modalGrowthPeriod = document.getElementById('modal-growth-period');
    const modalCategory = document.getElementById('modal-category');
    
    if (modalScientificName) modalScientificName.textContent = plant.scientificName;
    if (modalFamily) modalFamily.textContent = plant.family;
    if (modalOrigin) modalOrigin.textContent = plant.origin;
    if (modalGrowthPeriod) modalGrowthPeriod.textContent = plant.growthPeriod;
    if (modalCategory) {
        modalCategory.textContent = plant.category;
        modalCategory.className = `category-badge ${getCategoryClass(plant.category)}`;
    }
    
    // Nutrition and care
    const modalNutrition = document.getElementById('modal-nutrition');
    const modalCare = document.getElementById('modal-care');
    
    if (modalNutrition) modalNutrition.textContent = plant.nutrition;
    if (modalCare) modalCare.textContent = plant.care;
    
    // Diseases
    const modalDiseases = document.getElementById('modal-diseases');
    if (modalDiseases) {
        modalDiseases.innerHTML = '';
        plant.commonDiseases.forEach((disease, index) => {
            const diseaseItem = document.createElement('div');
            diseaseItem.className = 'disease-item';
            diseaseItem.innerHTML = `<h4 data-testid="text-disease-${index}">${disease}</h4>`;
            modalDiseases.appendChild(diseaseItem);
        });
    }
}

function createPlantChart(plant) {
    const canvas = document.getElementById('modal-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (chartInstance) {
        chartInstance.destroy();
    }
    
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Temperature (°C)', 'Humidity (%)', 'pH', 'Light (hrs)'],
            datasets: [{
                label: 'Growth Requirements',
                data: [plant.temperature, plant.humidity, plant.pH, plant.light],
                backgroundColor: [
                    'hsl(122, 39%, 49%)',
                    'hsl(45, 93%, 47%)',
                    'hsl(0, 84.2%, 60.2%)',
                    'hsl(240, 4.8%, 95.9%)'
                ],
                borderRadius: 4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--border').trim()
                    },
                    ticks: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--muted-foreground').trim()
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--muted-foreground').trim()
                    }
                }
            }
        }
    });
}

function initializeModal() {
    const modal = document.getElementById('plant-modal');
    const closeModalBtn = document.getElementById('close-modal');
    
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }
    
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }
    
    // ESC key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && modal.classList.contains('show')) {
            closeModal();
        }
    });
}

// ================= AI DIAGNOSIS =================
function initializeAIDiagnosis() {
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    const analyzeBtn = document.getElementById('analyze-btn');
    const resetBtn = document.getElementById('reset-btn');
    const fileControls = document.getElementById('file-controls');
    
    let selectedFile = null;
    
    // File input change
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                handleFileSelect(file);
            }
        });
    }
    
    // Upload zone click
    if (uploadZone) {
        uploadZone.addEventListener('click', () => {
            fileInput?.click();
        });
        
        // Drag and drop
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragover');
        });
        
        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('dragover');
        });
        
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                if (file.type.startsWith('image/')) {
                    handleFileSelect(file);
                } else {
                    showToast('Invalid File', 'Please select an image file', 'error');
                }
            }
        });
    }
    
    // Analyze button
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', () => {
            if (selectedFile) {
                analyzeImage(selectedFile);
            }
        });
    }
    
    // Reset button
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            resetDiagnosis();
        });
    }
    
    function handleFileSelect(file) {
        if (file.size > 10 * 1024 * 1024) {
            showToast('File Too Large', 'Please select an image smaller than 10MB', 'error');
            return;
        }
        
        selectedFile = file;
        
        // Update UI
        const uploadText = uploadZone?.querySelector('.upload-text');
        if (uploadText) {
            uploadText.textContent = file.name;
        }
        
        if (fileControls) {
            fileControls.classList.remove('hidden');
        }
        
        // Hide results
        hideResults();
    }
    
    async function analyzeImage(file) {
        showLoading();
        
        try {
            const result = await uploadImageForDiagnosis(file);
            showResults(result);
            
            showToast(
                'Analysis Complete',
                `Detected: ${result.disease} with ${result.confidence}% confidence`
            );
            
        } catch (error) {
            console.error('Analysis failed:', error);
            showToast('Analysis Failed', error.message, 'error');
            hideLoading();
        }
    }
    
    function resetDiagnosis() {
        selectedFile = null;
        
        if (fileInput) fileInput.value = '';
        
        const uploadText = uploadZone?.querySelector('.upload-text');
        if (uploadText) {
            uploadText.textContent = 'Click to upload or drag and drop';
        }
        
        if (fileControls) {
            fileControls.classList.add('hidden');
        }
        
        hideResults();
        hideLoading();
    }
    
    function showLoading() {
        const placeholder = document.getElementById('results-placeholder');
        const loading = document.getElementById('results-loading');
        const content = document.getElementById('results-content');
        
        if (placeholder) placeholder.classList.add('hidden');
        if (loading) loading.classList.remove('hidden');
        if (content) content.classList.add('hidden');
    }
    
    function hideLoading() {
        const placeholder = document.getElementById('results-placeholder');
        const loading = document.getElementById('results-loading');
        
        if (loading) loading.classList.add('hidden');
        if (placeholder) placeholder.classList.remove('hidden');
    }
    
    function showResults(result) {
        const placeholder = document.getElementById('results-placeholder');
        const loading = document.getElementById('results-loading');
        const content = document.getElementById('results-content');
        const descriptionCard = document.getElementById('description-card');
        
        if (placeholder) placeholder.classList.add('hidden');
        if (loading) loading.classList.add('hidden');
        if (content) content.classList.remove('hidden');
        
        // Disease name
        const diseaseName = document.getElementById('disease-name');
        if (diseaseName) {
            diseaseName.textContent = result.disease;
        }
        
        // Confidence
        const confidenceProgress = document.getElementById('confidence-progress');
        const confidenceValue = document.getElementById('confidence-value');
        
        if (confidenceProgress) {
            confidenceProgress.style.width = `${result.confidence}%`;
        }
        if (confidenceValue) {
            confidenceValue.textContent = `${result.confidence}%`;
        }
        
        // Description
        if (result.description && descriptionCard) {
            const diseaseDescription = document.getElementById('disease-description');
            if (diseaseDescription) {
                diseaseDescription.textContent = result.description;
            }
            descriptionCard.classList.remove('hidden');
        } else if (descriptionCard) {
            descriptionCard.classList.add('hidden');
        }
        
        // Recommendations
        const recommendationsList = document.getElementById('recommendations-list');
        if (recommendationsList && result.recommendations) {
            recommendationsList.innerHTML = '';
            result.recommendations.forEach((recommendation, index) => {
                const li = document.createElement('li');
                li.setAttribute('data-testid', `text-recommendation-${index}`);
                li.textContent = `• ${recommendation}`;
                recommendationsList.appendChild(li);
            });
        }
    }
    
    function hideResults() {
        const placeholder = document.getElementById('results-placeholder');
        const content = document.getElementById('results-content');
        
        if (placeholder) placeholder.classList.remove('hidden');
        if (content) content.classList.add('hidden');
    }
}

// ================= INITIALIZATION =================
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize theme
    initializeTheme();
    
    // Initialize components
    initializeVideoBackground();
    initializeNavigation();
    initializeSearch();
    initializePlantLibraryControls();
    initializeModal();
    initializeAIDiagnosis();
    
    // Load data
    await Promise.all([
        loadStats(),
        loadPlants()
    ]);
    
    // Add smooth scroll animations on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
            }
        });
    }, observerOptions);
    
    // Observe sections for animations
    document.querySelectorAll('section').forEach(section => {
        observer.observe(section);
    });
    
    // Initialize lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    console.log('AgroSmart AI application initialized successfully');
});

// ================= GLOBAL FUNCTIONS =================
// Make functions available globally for onclick handlers
window.scrollToSection = scrollToSection;
window.closeModal = closeModal;

// Handle window resize
window.addEventListener('resize', debounce(() => {
    if (chartInstance) {
        chartInstance.resize();
    }
}, 250));

// Handle system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (localStorage.getItem('agrosmartai-ui-theme') === 'system') {
        currentTheme = e.matches ? 'dark' : 'light';
        document.body.classList.toggle('dark', currentTheme === 'dark');
        updateThemeIcon();
    }
});

// Export for testing purposes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        scrollToSection,
        toggleTheme,
        filterPlants,
        openPlantModal,
        closeModal
    };
}