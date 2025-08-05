document.addEventListener('click', function(e) {
    var xpath;
    xpath = computeCSSSelector(e.target); 
    console.log(`Your xpath is : ${xpath}`);
});

function computeCSSSelector(element) {
        if (!(element instanceof Element)) return;
    
        // Helper function to escape special characters in CSS selectors
        function escapeIdentifier(identifier) {
            return CSS.escape(identifier);
        }
    
        // Helper function to check if a selector uniquely identifies the element
        function isUniqueSelector(selector, element) {
            const matches = document.querySelectorAll(selector);
            return matches.length === 1 && matches[0] === element;
        }
    
        // Helper function to get the nth-child index of an element
        function getNthChildIndex(element) {
            let index = 1;
            let sibling = element;
            while ((sibling = sibling.previousElementSibling) != null) {
                index++;
            }
            return index;
        }
    
        // Main function to build the selector
        let selectorParts = [];
        let currentElement = element;
    
        while (currentElement && currentElement.nodeType === Node.ELEMENT_NODE) {
            let selector = currentElement.nodeName.toLowerCase();
    
            // Use ID if available and unique
            if (currentElement.id) {
                selector = `#${escapeIdentifier(currentElement.id)}`;
                selectorParts.unshift(selector);
                break;
            }
    
            // Build class selector
            if (currentElement.className) {
                const classNames = currentElement.className.trim().split(/\s+/).filter(Boolean);
                if (classNames.length > 0) {
                    selector += '.' + classNames.map(escapeIdentifier).join('.');
                    if (isUniqueSelector(selector, element)) {
                        selectorParts.unshift(selector);
                        break;
                    }
                }
            }
    
            // Use nth-of-type if necessary
            const parent = currentElement.parentNode;
            if (parent) {
                const siblings = parent.children;
                const sameTagSiblings = Array.from(siblings).filter(sibling =>
                    sibling.nodeName.toLowerCase() === currentElement.nodeName.toLowerCase()
                );
                if (sameTagSiblings.length > 1) {
                    const index = Array.prototype.indexOf.call(sameTagSiblings, currentElement) + 1;
                    selector += `:nth-of-type(${index})`;
                }
            }
    
            selectorParts.unshift(selector);
    
            // Check if the current selector uniquely identifies the element
            const fullSelector = selectorParts.join(' > ');
            if (isUniqueSelector(fullSelector, element)) {
                return fullSelector;
            }
    
            currentElement = currentElement.parentNode;
        }
    
        return selectorParts.join(' > ');
    }  