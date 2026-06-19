
        // Set API Key config (empty string allows environment automatic runtime injection)
        const apiKey = ""; 
        const modelName = "gemini-2.5-flash";
        
        // Setup state management
        let currentTripData = null;
        let activeDayIndex = 0;

        // Element Selectors
        const form = document.getElementById('trip-form');
        const advTrigger = document.getElementById('advanced-trigger');
        const advArrow = document.getElementById('advanced-arrow');
        const advPanel = document.getElementById('advanced-panel');
        
        const stateInitial = document.getElementById('state-initial');
        const stateLoading = document.getElementById('state-loading');
        const stateError = document.getElementById('state-error');
        const stateResults = document.getElementById('state-results');
        
        const loadingTitle = document.getElementById('loading-title');
        const loadingSubtitle = document.getElementById('loading-subtitle');
        const loadingProgress = document.getElementById('loading-progress');
        const errorMessage = document.getElementById('error-message');

        // Dynamic content injection points
        const tripHeroImage = document.getElementById('trip-hero-image');
        const badgeDays = document.getElementById('badge-days');
        const badgeBudget = document.getElementById('badge-budget');
        const badgeCost = document.getElementById('badge-cost');
        const tripTitle = document.getElementById('trip-title');
        const tripSummary = document.getElementById('trip-summary');
        const renderTopTitle = document.getElementById('render-top-title');
        const dayTabsContainer = document.getElementById('day-tabs-container');
        
        // Active Day Info
        const dayThemeImage = document.getElementById('day-theme-image');
        const dayThemeTitle = document.getElementById('day-theme-title');
        const activitiesTimeline = document.getElementById('activities-timeline');
        
        // Hotels
        const hotelsContainer = document.getElementById('hotels-container');
        const mapLabel = document.getElementById('map-label');
        const googleMapsLink = document.getElementById('google-maps-link');

        // Setup collapsible panel
        advTrigger.addEventListener('click', () => {
            const isHidden = advPanel.classList.toggle('hidden');
            advArrow.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(180deg)';
        });

        // Trigger loading state updates to make the experience feel organic
        function updateLoader(percent, title, subtitle) {
            loadingProgress.style.width = `${percent}%`;
            if (title) loadingTitle.textContent = title;
            if (subtitle) loadingSubtitle.textContent = subtitle;
        }

        // Handle Form Submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const destination = document.getElementById('destination').value.trim();
            const daysCount = document.getElementById('days').value;
            const budget = document.getElementById('budget').value;
            const interests = document.getElementById('interests').value.trim();
            const companion = document.getElementById('travelers').value;

            if (!destination) return;

            // Transition UI State to Loading
            stateInitial.classList.add('hidden');
            stateResults.classList.add('hidden');
            stateError.classList.add('hidden');
            stateLoading.classList.remove('hidden');

            // Set organic progressive loading steps
            updateLoader(10, "Charting Destination...", `Plotting route to ${destination}`);
            
            try {
                setTimeout(() => updateLoader(35, "Scanning Accommodations...", `Analyzing ${budget} budget stays`), 1200);
                setTimeout(() => updateLoader(60, "Assembling Activities...", `Curating local insights matching "${interests || 'Classic'}"`), 2800);
                setTimeout(() => updateLoader(85, "Optimizing Itinerary...", "Generating beautiful visuals & schedules"), 4500);

                const itineraryData = await generateAILine(destination, daysCount, budget, interests, companion);
                
                // Show final rendering state
                updateLoader(100, "Ready!", "Your experience is generated.");
                
                setTimeout(() => {
                    stateLoading.classList.add('hidden');
                    renderTrip(itineraryData, destination);
                }, 800);

            } catch (err) {
                console.error("AI Generation Error:", err);
                stateLoading.classList.add('hidden');
                stateError.classList.remove('hidden');
                errorMessage.textContent = err.message || "An error occurred with the AI backend service. Please try again.";
            }
        });

        // Fallback or retry helper
        function retryForm() {
            stateError.classList.add('hidden');
            stateInitial.classList.remove('hidden');
        }

        // Call Gemini-2.5-flash model utilizing exponential backoff
        async function generateAILine(destination, days, budget, interests, companion) {
            const systemPrompt = `You are VibeVoyage, an expert AI travel planner that creates custom luxury-themed or budget-optimized itineraries. You MUST return ONLY a raw JSON block that matches the exact requested schema. Do not output any markdown formatting ticks or formatting labels, return only valid raw JSON.`;
            
            const userQuery = `Create a highly tailored ${days}-day travel itinerary for "${destination}" targeting a "${budget}" budget. 
The traveler profile is "${companion}" with specific interests: "${interests || 'General sightseeing, local food, hidden gems'}". 
Format the response ONLY in raw JSON matching this structure perfectly:
{
  "trip_title": "string (creative descriptive name of the trip)",
  "summary": "string (engaging 2-3 sentence teaser summarizing the trip experience)",
  "currency": "string (the standard currency of the destination like USD, EUR, JPY, GBP etc)",
  "total_estimated_cost": "string (approximate total budget description like '$1,200')",
  "daily_plan": [
    {
      "day": number (e.g. 1),
      "theme": "string (e.g. 'Historic Highlights & Traditional Flavors')",
      "best_image_keyword": "string (ultra-descriptive image prompt for a scenic landscape of this day theme)",
      "activities": [
        {
          "time": "string (e.g., '09:00 AM')",
          "activity": "string (highly specific interesting activity name)",
          "description": "string (engaging, helpful 1-2 sentence description explaining what to do, eat or explore)",
          "location": "string (name of landmark/venue)",
          "cost": "string (approximate cost in local currency or 'Free')"
        }
      ]
    }
  ],
  "hotels": [
    {
      "name": "string (real or highly realistic hotel/stay name)",
      "rating": "string (e.g., '4.7 ★')",
      "price_per_night": "string (e.g. '$120 / night')",
      "description": "string (why this match is excellent for this budget/vibe)",
      "image_keyword": "string (specific photographic interior or facade prompt for Pollinations.ai search)"
    }
  ]
}`;

            let retries = 5;
            let delay = 1000;

            while (retries > 0) {
                try {
                    const response = await fetch( `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: userQuery }] }],
                            systemInstruction: { parts: [{ text: systemPrompt }] },
                            generationConfig: {
                                responseMimeType: "application/json"
                            }
                        })
                    });

                    if (!response.ok) {
                        throw new Error(`Server returned status ${response.status}`);
                    }

                    const result = await response.json();
                    let rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
                    
                    if (!rawText) {
                        throw new Error("No text returned in candidate response");
                    }

                    rawText = rawText.trim();
                    const parsedData = JSON.parse(rawText);
                    return parsedData;

                } catch (error) {
                    retries--;
                    if (retries === 0) {
                        throw error;
                    }
                    // Exponential backoff
                    await new Promise(res => setTimeout(res, delay));
                    delay *= 2;
                }
            }
        }

        // Render functions
        function renderTrip(data, destination) {
            currentTripData = data;
            activeDayIndex = 0;

            // Global Trip header elements
            tripTitle.textContent = data.trip_title || `Adventure in ${destination}`;
            tripSummary.textContent = data.summary || `A beautifully designed custom trip itinerary tailored to you.`;
            renderTopTitle.textContent = data.trip_title || `Trip to ${destination}`;
            
            badgeDays.innerHTML = `<i class="ph ph-calendar-blank"></i> ${data.daily_plan.length} Days`;
            badgeBudget.innerHTML = `<i class="ph ph-wallet"></i> ${document.getElementById('budget').value}`;
            badgeCost.innerHTML = `<i class="ph ph-coins"></i> Total Est: ${data.total_estimated_cost || 'Varies'}`;
            
            // Set Hero Banner Image utilizing Pollinations.ai with clean query terms
            const cleanDest = encodeURIComponent(destination + " scenic travel destination widescreen photography raw");
            tripHeroImage.src = `https://image.pollinations.ai/prompt/${cleanDest}?width=1200&height=600&nologo=true&seed=${Math.floor(Math.random() * 1000)}`;
            tripHeroImage.onerror = function() {
                this.src = "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80"; // Beautiful fallback
            };

            // Set map previews
            mapLabel.textContent = `${destination}`;
            googleMapsLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;

            // Build dynamic Tabs and Active Days
            renderDayTabs(data.daily_plan);
            switchDay(0);

            // Build Hotel recommendations
            renderHotels(data.hotels, destination);

            // Show results container
            stateResults.classList.remove('hidden');
            stateResults.scrollIntoView({ behavior: 'smooth' });
        }

        function renderDayTabs(days) {
            dayTabsContainer.innerHTML = '';
            
            days.forEach((dayPlan, index) => {
                const tab = document.createElement('button');
                tab.className = `flex-shrink-0 px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                    index === activeDayIndex 
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20' 
                    : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300'
                }`;
                tab.innerHTML = `<i class="ph ph-sun-dim"></i> Day ${dayPlan.day}`;
                tab.onclick = () => switchDay(index);
                dayTabsContainer.appendChild(tab);
            });
        }

        function switchDay(index) {
            activeDayIndex = index;
            const dayPlan = currentTripData.daily_plan[index];
            if (!dayPlan) return;

            // Update Tab Selection Styling
            Array.from(dayTabsContainer.children).forEach((tab, idx) => {
                if (idx === index) {
                    tab.className = 'flex-shrink-0 px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20';
                } else {
                    tab.className = 'flex-shrink-0 px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-300';
                }
            });

            // Set Theme Banner
            dayThemeTitle.textContent = dayPlan.theme || `Highlights of Day ${dayPlan.day}`;
            
            // Build visual imagery for the theme of this day
            const dayImageKeyword = encodeURIComponent(`${dayPlan.best_image_keyword || dayPlan.theme || 'scenic view'} travel landscape`);
            dayThemeImage.src = `https://image.pollinations.ai/prompt/${dayImageKeyword}?width=800&height=400&nologo=true&seed=${Math.floor(Math.random() * 1000)}`;
            dayThemeImage.onerror = function() {
                this.src = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80";
            };

            // Build activities list elements
            activitiesTimeline.innerHTML = '';
            dayPlan.activities.forEach((activity, idx) => {
                const activityItem = document.createElement('div');
                activityItem.className = 'relative pl-6 pb-6 border-b border-slate-800/60 last:border-b-0 last:pb-0';
                
                // Beautiful small timeline node indicator
                activityItem.innerHTML = `
                    <div class="absolute -left-[23px] top-1.5 w-3.5 h-3.5 rounded-full bg-indigo-500 border-2 border-[#0f172a] shadow-md shadow-indigo-500/40 z-10"></div>
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                        <span class="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20 w-fit">
                            ${activity.time}
                        </span>
                        <span class="text-xs font-bold text-emerald-400">
                            ${activity.cost || 'Free'}
                        </span>
                    </div>
                    <h5 class="text-base font-bold text-white mb-1 flex items-center gap-1.5">
                        ${activity.activity}
                        <span class="text-xs text-slate-400 font-normal">at ${activity.location}</span>
                    </h5>
                    <p class="text-sm text-slate-300 leading-relaxed font-light">${activity.description}</p>
                `;
                
                activitiesTimeline.appendChild(activityItem);
            });
        }

        function renderHotels(hotels, destination) {
            hotelsContainer.innerHTML = '';
            
            if (!hotels || hotels.length === 0) {
                hotelsContainer.innerHTML = `
                    <div class="text-center py-6 text-slate-400 text-sm">
                        No accommodation details generated. Check standard regional reservation agencies.
                    </div>
                `;
                return;
            }

            hotels.forEach(hotel => {
                const card = document.createElement('div');
                card.className = 'glass-card rounded-2xl overflow-hidden hover:scale-[1.01] transition-transform duration-300';
                
                // Fetch dynamic hotel visual based on prompt
                const hotelKey = encodeURIComponent(`${hotel.name} premium interior hotel lobby room design architecture`);
                const hotelImgSrc = `https://image.pollinations.ai/prompt/${hotelKey}?width=400&height=250&nologo=true&seed=${Math.floor(Math.random() * 1000)}`;

                card.innerHTML = `
                    <div class="relative h-32">
                        <img src="${hotelImgSrc}" alt="${hotel.name}" class="w-full h-full object-cover opacity-80" onerror="this.src='https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80'">
                        <div class="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
                        <div class="absolute top-2 right-2 bg-indigo-500 text-white font-bold text-xs px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                            ${hotel.rating}
                        </div>
                    </div>
                    <div class="p-4 space-y-2">
                        <div class="flex justify-between items-start gap-2">
                            <h5 class="font-bold text-white text-sm line-clamp-1">${hotel.name}</h5>
                            <span class="text-xs font-bold text-indigo-300 whitespace-nowrap">${hotel.price_per_night}</span>
                        </div>
                        <p class="text-xs text-slate-300 leading-relaxed font-light line-clamp-2">${hotel.description}</p>
                    </div>
                `;

                hotelsContainer.appendChild(card);
            });
        }

        // Export/Generate PDF with html2pdf.js utilizing clear visual themes
        function downloadPDF() {
            if (!currentTripData) return;

            const element = document.getElementById('itinerary-pdf-wrapper');
            
            // Clean/Optimize style parameters for standard PDF printing
            const opt = {
                margin:       [10, 10, 10, 10],
                filename:     `${currentTripData.trip_title.replace(/\s+/g, '_')}_itinerary.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { 
                    scale: 2, 
                    useCORS: true, 
                    backgroundColor: '#0b0f19',
                    scrollX: 0,
                    scrollY: 0
                },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            // Temporarily apply style transformations to guarantee white/clean text readability during generation
            html2pdf().from(element).set(opt).save();
        }
