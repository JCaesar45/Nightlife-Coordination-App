// public/js/app.js
const app = {
    state: {
        user: null,
        venues: [],
        currentSearch: null,
        offset: 0,
        isLoading: false
    },

    init() {
        this.checkAuth();
        this.bindEvents();
        this.checkUrlParams();
    },

    bindEvents() {
        document.getElementById('searchForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSearch();
        });

        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin(e.target);
        });

        document.getElementById('registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister(e.target);
        });

        document.getElementById('loadMoreBtn')?.addEventListener('click', () => {
            this.loadMore();
        });
    },

    checkUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const location = params.get('location');
        if (location) {
            document.getElementById('locationInput').value = location;
            this.searchVenues(location);
        }
    },

    async checkAuth() {
        try {
            const res = await fetch('/api/auth/me');
            const data = await res.json();
            if (data.user) {
                this.state.user = data.user;
                this.updateUIForUser();
            } else {
                this.updateUIForGuest();
            }
        } catch (err) {
            console.error('Auth check failed:', err);
        }
    },

    updateUIForUser() {
        const section = document.getElementById('userSection');
        const authPrompt = document.getElementById('authPrompt');
        
        section.innerHTML = `
            <div class="user-info">
                <div class="user-avatar">${this.state.user.displayName.charAt(0).toUpperCase()}</div>
                <span>${this.state.user.displayName}</span>
            </div>
            <button onclick="app.logout()" class="btn btn-sm btn-secondary">Logout</button>
        `;
        
        if (authPrompt) authPrompt.style.display = 'none';
        
        // Refresh venues to show attendance status
        if (this.state.currentSearch) {
            this.searchVenues(this.state.currentSearch, 0, true);
        }
    },

    updateUIForGuest() {
        const section = document.getElementById('userSection');
        const authPrompt = document.getElementById('authPrompt');
        
        section.innerHTML = `
            <button onclick="app.openAuthModal()" class="btn btn-primary">Login / Register</button>
        `;
        
        if (authPrompt) authPrompt.style.display = 'block';
    },

    async handleSearch() {
        const location = document.getElementById('locationInput').value.trim();
        if (!location) return;
        
        // Update URL without reload
        const url = new URL(window.location);
        url.searchParams.set('location', location);
        window.history.pushState({}, '', url);
        
        this.state.currentSearch = location;
        this.state.offset = 0;
        await this.searchVenues(location, 0, true);
    },

    async searchVenues(location, offset = 0, clearExisting = false) {
        if (this.state.isLoading) return;
        
        this.state.isLoading = true;
        document.getElementById('loader').style.display = 'block';
        if (clearExisting) {
            document.getElementById('venuesGrid').innerHTML = '';
            document.getElementById('resultsSection').style.display = 'none';
        }

        try {
            const res = await fetch(`/api/venues/search?location=${encodeURIComponent(location)}&offset=${offset}`);
            const data = await res.json();
            
            if (data.error) throw new Error(data.error);
            
            this.state.venues = clearExisting ? data.venues : [...this.state.venues, ...data.venues];
            this.renderVenues(data.venues, clearExisting);
            this.state.offset = offset + data.venues.length;
            
            // Update UI
            document.getElementById('resultsSection').style.display = 'block';
            document.querySelector('.location-name').textContent = location;
            document.getElementById('resultsMeta').textContent = `Found ${data.total} venues`;
            
            // Show/hide load more
            document.getElementById('loadMoreContainer').style.display = 
                this.state.offset < data.total ? 'block' : 'none';
                
        } catch (err) {
            this.showToast(err.message, 'error');
        } finally {
            this.state.isLoading = false;
            document.getElementById('loader').style.display = 'none';
        }
    },

    renderVenues(venues, clearExisting) {
        const grid = document.getElementById('venuesGrid');
        
        venues.forEach(venue => {
            const card = document.createElement('div');
            card.className = 'venue-card';
            card.id = `venue-${venue.id}`;
            
            const isGoing = venue.isGoing || (this.state.user?.goingTo?.some(v => v.yelpId === venue.id));
            const btnClass = isGoing ? 'btn-danger' : 'btn-primary';
            const btnText = isGoing ? 'Cancel' : 'I\'m Going';
            const attendeeClass = venue.attendeeCount > 0 ? 'going' : '';
            
            // Generate attendee avatars HTML
            let attendeesHtml = '';
            if (venue.attendees && venue.attendees.length > 0) {
                venue.attendees.slice(0, 3).forEach((name, i) => {
                    attendeesHtml += `<div class="avatar-mini">${name.charAt(0)}</div>`;
                });
                if (venue.attendeeCount > 3) {
                    attendeesHtml += `<div class="avatar-mini">+${venue.attendeeCount - 3}</div>`;
                }
            }
            
            card.innerHTML = `
                <div class="venue-image" style="background-image: url('${venue.imageUrl || 'https://via.placeholder.com/400x300?text=No+Image'}')">
                    <div class="venue-rating">
                        <i class="fas fa-star" style="color: #fbbf24;"></i>
                        ${venue.rating}
                    </div>
                </div>
                <div class="venue-content">
                    <h3 class="venue-name">${venue.name}</h3>
                    <div class="venue-location">
                        <i class="fas fa-map-pin"></i>
                        ${venue.location.address || 'Address unavailable'}, ${venue.location.city}
                    </div>
                    <div class="venue-footer">
                        <div class="attendee-count ${attendeeClass}">
                            <div class="attendee-avatars">${attendeesHtml}</div>
                            <span>${venue.attendeeCount} going</span>
                        </div>
                        ${this.state.user ? `
                            <button onclick="app.toggleAttendance('${venue.id}', this)" 
                                    class="btn btn-sm ${btnClass}" 
                                    data-venue="${venue.id}">
                                ${btnText}
                            </button>
                        ` : `
                            <button onclick="app.openAuthModal()" class="btn btn-sm btn-secondary">
                                Login to RSVP
                            </button>
                        `}
                    </div>
                </div>
            `;
            
            grid.appendChild(card);
        });
    },

    async toggleAttendance(yelpId, btn) {
        try {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            
            const res = await fetch(`/api/venues/${yelpId}/attend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const data = await res.json();
            
            if (data.error) throw new Error(data.error);
            
            // Update button
            if (data.attending) {
                btn.className = 'btn btn-sm btn-danger';
                btn.innerHTML = 'Cancel';
                this.showToast('You\'re going tonight!', 'success');
            } else {
                btn.className = 'btn btn-sm btn-primary';
                btn.innerHTML = 'I\'m Going';
                this.showToast('Removed from your plans', 'success');
            }
            
            // Update attendee count in UI
            this.updateAttendeeCount(yelpId, data.attendeeCount, data.attending);
            
        } catch (err) {
            this.showToast(err.message, 'error');
        } finally {
            btn.disabled = false;
        }
    },

    updateAttendeeCount(yelpId, count, isUserGoing) {
        const card = document.getElementById(`venue-${yelpId}`);
        if (!card) return;
        
        const countEl = card.querySelector('.attendee-count span');
        countEl.textContent = `${count} going`;
        
        if (count > 0) {
            card.querySelector('.attendee-count').classList.add('going');
        } else {
            card.querySelector('.attendee-count').classList.remove('going');
        }
    },

    loadMore() {
        if (this.state.currentSearch) {
            this.searchVenues(this.state.currentSearch, this.state.offset);
        }
    },

    // Auth Handlers
    openAuthModal() {
        document.getElementById('authModal').classList.add('active');
    },

    closeAuthModal() {
        document.getElementById('authModal').classList.remove('active');
    },

    switchAuthTab(tab) {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        event.target.classList.add('active');
        
        if (tab === 'login') {
            document.getElementById('loginForm').style.display = 'block';
            document.getElementById('registerForm').style.display = 'none';
        } else {
            document.getElementById('loginForm').style.display = 'none';
            document.getElementById('registerForm').style.display = 'block';
        }
    },

    async handleLogin(form) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            const result = await res.json();
            
            if (result.error) throw new Error(result.error);
            
            this.state.user = result.user;
            this.closeAuthModal();
            this.updateUIForUser();
            this.showToast('Welcome back!', 'success');
            
        } catch (err) {
            this.showToast(err.message || 'Login failed', 'error');
        }
    },

    async handleRegister(form) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            const result = await res.json();
            
            if (result.errors || result.error) {
                throw new Error(result.errors?.[0]?.msg || result.error);
            }
            
            this.state.user = result.user;
            this.closeAuthModal();
            this.updateUIForUser();
            this.showToast('Account created successfully!', 'success');
            
        } catch (err) {
            this.showToast(err.message, 'error');
        }
    },

    async logout() {
        try {
            await fetch('/api/auth/logout');
            this.state.user = null;
            this.updateUIForGuest();
            this.showToast('Logged out successfully', 'success');
            
            // Refresh to clear personal data
            if (this.state.currentSearch) {
                this.searchVenues(this.state.currentSearch, 0, true);
            }
        } catch (err) {
            this.showToast('Logout failed', 'error');
        }
    },

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' ? 'check-circle' : 
                    type === 'error' ? 'exclamation-circle' : 'info-circle';
        
        toast.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => app.init());
