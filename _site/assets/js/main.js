async function loadPublications() {
    try {
        console.log('Attempting to load publications...');
        const response = await fetch('../assets/data/publications.bib');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const bibText = await response.text();
        console.log('Loaded bib text:', bibText);
        const publications = parseBibtex(bibText);
        console.log('Parsed publications:', publications);
        displayPublications(publications);
    } catch (error) {
        console.error('Error loading publications:', error);
        const container = document.getElementById('publications-list');
        if (container) {
            container.innerHTML = `<p style="color: red;">Error loading publications. Please try again later.</p>`;
        }
    }
}

function parseBibtex(bibText) {
    const entries = [];
    const entryRegex = /@(\w+)\s*{\s*([^,]*),([^@]*)/g;
    const fieldRegex = /(\w+)\s*=\s*{([^}]*)}/g;

    let match;
    while ((match = entryRegex.exec(bibText)) !== null) {
        const [_, type, citationKey, fieldsText] = match;
        const entry = { type, citationKey };
        
        let fieldMatch;
        while ((fieldMatch = fieldRegex.exec(fieldsText)) !== null) {
            const [__, field, value] = fieldMatch;
            entry[field.toLowerCase()] = value;
        }
        entries.push(entry);
    }
    return entries;
}

function displayPublications(publications) {
    const container = document.getElementById('publications-list');
    publications.sort((a, b) => b.year - a.year);

    // Create sections for different types
    const sections = {
        journal: { title: 'Journal Papers', items: [] },
        conference: { title: 'Conference Papers', items: [] },
        workshop: { title: 'Workshop Papers', items: [] },
        preprint: { title: 'Preprints', items: [] }
    };

    // Categorize publications
    publications.forEach(pub => {
        let pubType = 'conference';  // Default to conference
        if (pub.journal) {
            // Check if it's a preprint
            if (pub.journal.toLowerCase().includes('arxiv') || 
                pub.journal.toLowerCase().includes('preprint')) {
                pubType = 'preprint';
            } else {
                pubType = 'journal';
            }
        } else if (pub.booktitle) {
            pubType = pub.booktitle.toLowerCase().includes('workshop') ? 'workshop' : 'conference';
        }
        sections[pubType].items.push(pub);
    });

    // Reorder sections to show preprints first
    const orderedSections = ['preprint', 'conference', 'journal', 'workshop'];
    
    // Create HTML for each section in order
    orderedSections.forEach(type => {
        const section = sections[type];
        if (section.items.length > 0) {
            const sectionElement = document.createElement('div');
            sectionElement.className = 'publication-section';
            sectionElement.innerHTML = `
                <h3 class="section-title">${section.title}</h3>
                <div class="section-papers">
                    ${section.items.map(pub => `
                        <div class="publication" data-type="${type}">
                            <div class="pub-content">
                                <h3>${pub.title}</h3>
                                <p class="authors">${formatAuthors(pub.author)}</p>
                                <div class="venue">
                                    <span class="venue-name">${pub.booktitle || pub.journal}</span>
                                    <span class="year">(${pub.year})</span>
                                </div>
                                <div class="pub-links">
                                    ${pub.url ? `<a href="${pub.url}" target="_blank"><i class="fas fa-file-pdf"></i>Paper</a>` : ''}
                                    ${pub.code ? `<a href="${pub.code}" target="_blank"><i class="fas fa-code"></i>Code</a>` : ''}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            container.appendChild(sectionElement);
        }
    });
}

function formatAuthors(authors) {
    return authors.split(' and ')
        .map(author => {
            // Bold both regular name and name with asterisk
            if (author.includes('Xingjian Zhang') || 
                author.includes('Xingjian Zhang*')) {
                // Remove any asterisk and add it back after the name
                const cleanName = author.replace(/[*]/g, '').trim();
                const hasAsterisk = author.includes('*');
                return `<strong>${cleanName}${hasAsterisk ? '*' : ''}</strong>`;
            }
            return author;
        })
        .join(', ');
}

document.addEventListener('DOMContentLoaded', () => {
    const publicationsList = document.getElementById('publications-list');
    if (publicationsList) {
        loadPublications();
    }
});
