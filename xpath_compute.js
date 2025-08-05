document.addEventListener('click', function(e) {
    var xpath;
    xpath = computeXPath(e.target); 
    console.log(`Your xpath is : ${xpath}`);
});

function computeXPath(element) {
        if (!element) return null;
    
        function escapeXPathString(str) {
            if (!str.includes("'")) return `'${str}'`;
            if (!str.includes('"')) return `"${str}"`;
            let parts = str.split("'");
            let xpathString = "concat(";
            for (let i = 0; i < parts.length; i++) {
                xpathString += `'${parts[i]}'`;
                if (i < parts.length - 1) {
                    xpathString += `, "'", `;
                }
            }
            xpathString += ")";
            return xpathString;
        }
    
        function isInteractable(element) {
            const style = window.getComputedStyle(element);
            return (
                style.display !== "none" &&
                style.visibility !== "hidden" &&
                element.offsetWidth > 0 &&
                element.offsetHeight > 0 &&
                !element.disabled
            );
        }
    
        function isUniqueXPath(xpath, element = null) {
            const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            const interactableElements = [];
        
            for (let i = 0; i < result.snapshotLength; i++) {
                let currentElement = result.snapshotItem(i);
                if (isInteractable(currentElement)) {
                    interactableElements.push({ element: currentElement, index: i + 1 }); // Store element and 1-based index
                }
            }
        
            if (interactableElements.length !== 1) {
                return { isUnique: false, index: null };
            }
        
            if (element) {
                return {
                    isUnique: interactableElements[0].element === element,
                    index: interactableElements[0].index
                };
            }
            return { isUnique: true, index: interactableElements[0].index };
        }        
    
        function getElementIndex(element) {
            let index = 1;
            let sibling = element.previousSibling;
            while (sibling) {
                if (sibling.nodeType === 1 && sibling.tagName === element.tagName && isInteractable(sibling)) {
                    index++;
                }
                sibling = sibling.previousSibling;
            }
            return index;
        }
    
        function getAncestorWithUniqueAttribute(element) {
            while (element && element.nodeType === 1) {
                const attributes = ['id', 'name', 'type', 'value', 'class', 'title', 'alt', 'col-id', 'colid', 'ref', 'role', 'ng-bind', 'aria-label', 'formcontrolname'];
                for (let attr of attributes) {
                    if (element.hasAttribute(attr)) {
                        let attrValue = element.getAttribute(attr);
                        let xpath;
    
                        // Check if the attribute value ends with '_number'
                        if (/_(\d+)$/.test(attrValue)) {
                            // Remove '_number' at the end
                            let modifiedAttrValue = attrValue.replace(/_(\d+)$/, '');
                            xpath = `//${element.tagName.toLowerCase()}[contains(@${attr}, ${escapeXPathString(modifiedAttrValue)})]`;
                        } else {
                            xpath = `//${element.tagName.toLowerCase()}[@${attr}=${escapeXPathString(attrValue)}]`;
                        }
                        let uniqueness = isUniqueXPath(xpath, element);
                        if (uniqueness.isUnique) {
                            return { ancestor: element, attribute: attr, value: attrValue };
                        }
                    }
                }
                element = element.parentNode;
            }
            return null;
        }
    
        function buildXPathFromAncestor(ancestorInfo, element) {
            let ancestor = ancestorInfo.ancestor;
            let attr = ancestorInfo.attribute;
            let attrValue = ancestorInfo.value;
            let xpath;
    
            // Check if the attribute value ends with '_number'
            if (/_(\d+)$/.test(attrValue)) {
                // Remove '_number' at the end
                let modifiedAttrValue = attrValue.replace(/_(\d+)$/, '');
                xpath = `//${ancestor.tagName.toLowerCase()}[contains(@${attr}, ${escapeXPathString(modifiedAttrValue)})]`;
            } else {
                xpath = `//${ancestor.tagName.toLowerCase()}[@${attr}=${escapeXPathString(attrValue)}]`;
            }
    
            let pathSegments = [];
            let currentElement = element;
    
            while (currentElement && currentElement !== ancestor) {
                let tagName = currentElement.tagName.toLowerCase();
                let predicate = '';
                const attributes = ['id', 'name', 'type', 'value', 'class', 'title', 'alt', 'col-id', 'colid', 'ref', 'role', 'ng-bind', 'aria-label', 'formcontrolname'];
    
                // Try to find a unique attribute for the current element
                for (let attr of attributes) {
                    if (currentElement.hasAttribute(attr)) {
                        let attrValue = currentElement.getAttribute(attr);
                        // Check if the attribute value ends with '_number'
                        if (/_(\d+)$/.test(attrValue)) {
                            // Remove '_number' at the end
                            let modifiedAttrValue = attrValue.replace(/_(\d+)$/, '');
                            predicate = `[contains(@${attr}, ${escapeXPathString(modifiedAttrValue)})]`;
                        } else {
                            predicate = `[@${attr}=${escapeXPathString(attrValue)}]`;
                        }
    
                        let testXpath = `${xpath}//${tagName}${predicate}`;
                        let uniqueness = isUniqueXPath(testXpath);
                        if (uniqueness.isUnique) {
                            if (uniqueness.index > 1) {
                                testXpath = `(${testXpath})[${uniqueness.index}]`; // Add index if necessary
                            }
                            return testXpath;
                        }
                    }
                }
    
                // Try to use text content
                let textContent = currentElement.textContent.trim();
                if (textContent) {
                    let shortenedText = textContent.substring(0, 50);
                    let escapedText = escapeXPathString(shortenedText);
                    predicate = `[contains(normalize-space(.), ${escapedText})]`;
                    let testXpath = `${xpath}//${tagName}${predicate}`;
                    let uniqueness = isUniqueXPath(testXpath);
                    if (uniqueness.isUnique) {
                        if (uniqueness.index > 1) {
                            testXpath = `(${testXpath})[${uniqueness.index}]`; // Add index if necessary
                        }
                        return testXpath;
                    }
                }
    
                // Use index if no unique attribute or text
                let index = getElementIndex(currentElement);
                predicate = index > 1 ? `[${index}]` : '';
                pathSegments.unshift(`${tagName}${predicate}`);
                currentElement = currentElement.parentNode;
            }
    
            if (pathSegments.length > 0) {
                xpath += '//' + pathSegments.join('//');
                let uniqueness = isUniqueXPath(xpath, element);
                if (uniqueness.isUnique) {
                    if (uniqueness.index > 1) {
                        xpath = `(${xpath})[${uniqueness.index}]`; // Add index if necessary
                    }
                    return xpath;
                }
            }
    
            // If XPath is still not unique, add positional indices
            xpath = `//${ancestor.tagName.toLowerCase()}[@${attr}=${escapeXPathString(attrValue)}]`;
            currentElement = element;
            pathSegments = [];
    
            while (currentElement && currentElement !== ancestor) {
                let tagName = currentElement.tagName.toLowerCase();
                let index = getElementIndex(currentElement);
                let predicate = `[${index}]`;
                pathSegments.unshift(`${tagName}${predicate}`);
                currentElement = currentElement.parentNode;
            }
    
            if (pathSegments.length > 0) {
                xpath += '//' + pathSegments.join('/');
            }
            return xpath;
        }

        function getTextXPath(element) {
            if (!element || typeof element.textContent !== 'string') return null; // <-- Add this line
            const textContent = element.textContent.trim();
            if (textContent) {
                const shortenedText = textContent.substring(0, 50); // Avoid overly long xpaths
                const escapedText = escapeXPathString(shortenedText);
                let xpath = `//${element.tagName.toLowerCase()}[contains(text(), ${escapedText})]`;
                let uniqueness = isUniqueXPath(xpath, element);
                if (uniqueness.isUnique) {
                    if (uniqueness.index > 1) {
                        xpath = `(${xpath})[${uniqueness.index}]`; // Add index if necessary
                    }
                    return xpath;
                }
            }
            return null;
        }
    
        function getElementIndex(element) {
            let index = 1;
            let sibling = element.previousSibling;
            while (sibling) {
                if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
                    index++;
                }
                sibling = sibling.previousSibling;
            }
            return index;
        }
    
        function generateRelativeXPath(element) {
            var paths = [];
            var currentElement = element;
    
            while (currentElement && currentElement.nodeType === 1) {
                let tagName = currentElement.tagName.toLowerCase();
                let predicate = '';
                const attributes = ['id', 'name', 'type', 'value', 'class', 'title', 'alt', 'col-id', 'colid', 'ref', 'role', 'ng-bind', 'aria-label', 'formcontrolname'];
    
                // Try to use a unique attribute
                for (let attr of attributes) {
                    if (currentElement.hasAttribute(attr)) {
                        let attrValue = currentElement.getAttribute(attr);
                        // Check if the attribute value ends with '_number'
                        if (/_(\d+)$/.test(attrValue)) {
                            // Remove '_number' at the end
                            let modifiedAttrValue = attrValue.replace(/_(\d+)$/, '');
                            predicate = `[contains(@${attr}, ${escapeXPathString(modifiedAttrValue)})]`;
                        } else {
                            predicate = `[@${attr}=${escapeXPathString(attrValue)}]`;
                        }
    
                        let testXpath = `//${paths.concat([tagName + predicate]).join('//')}`;
                        let uniqueness = isUniqueXPath(testXpath);
                        if (uniqueness.isUnique) {
                            paths.unshift(tagName + predicate);
                            return `//${paths.join('//')}`;
                        }
                    }
                }
    
                // Try to use text content
                let textContent = currentElement.textContent.trim();
                if (textContent) {
                    let shortenedText = textContent.substring(0, 50);
                    let escapedText = escapeXPathString(shortenedText);
                    predicate = `[contains(normalize-space(.), ${escapedText})]`;
                    let testXpath = `//${paths.concat([tagName + predicate]).join('//')}`;
                    let uniqueness = isUniqueXPath(testXpath);
                    if (uniqueness.isUnique) {
                        paths.unshift(tagName + predicate);
                        return `//${paths.join('//')}`;
                    }
                }
    
                // Use index if no unique attribute or text
                let index = getElementIndex(currentElement);
                predicate = `[${index}]`;
                paths.unshift(`${tagName}${predicate}`);
                currentElement = currentElement.parentNode;
            }
    
            return paths.length ? `//${paths.join('//')}` : null;
        }
    
        // Special handling for SVG elements
        if (element.namespaceURI === 'http://www.w3.org/2000/svg') {
            console.log('SVG element detected');
        
            // Helper to get 1-based index among siblings with the same localName in the SVG namespace
            function getSvgElementIndex(el) {
                let index = 1;
                let sibling = el.previousElementSibling;
                while (sibling) {
                    if (
                        sibling.namespaceURI === 'http://www.w3.org/2000/svg' &&
                        sibling.localName === el.localName
                    ) {
                        index++;
                    }
                    sibling = sibling.previousElementSibling;
                }
                return index;
            }
        
            let segments = [];
            let current = element;
        
            // Climb up the DOM tree while we're still in the SVG namespace
            while (current && current.namespaceURI === 'http://www.w3.org/2000/svg') {
                let tagName = current.localName; // e.g. 'svg', 'path', 'circle'
                let index = getSvgElementIndex(current);
                
                // Use local-name() to handle SVG elements properly
                let segment = `*[local-name()='${tagName}']`;
                if (index > 1) {
                    segment += `[${index}]`;
                }
                segments.unshift(segment);
            
                // If we find an ancestor SVG with a unique attribute, stop here
                if (current.hasAttribute('id')) {
                    let idValue = current.getAttribute('id');
                    let uniqueXPath = `//${segments.join('/')}`;
                    let uniqueness = isUniqueXPath(uniqueXPath, element);
                    if (uniqueness.isUnique) {
                        return uniqueXPath;
                    }
                }
            
                current = current.parentNode;
            }
        
            // Ensure it's not an absolute XPath (shouldn't start with /html)
            let finalXPath = segments.length ? '//' + segments.join('/') : null;
        
            // Check uniqueness again
            let uniqueness = isUniqueXPath(finalXPath, element);
            if (uniqueness.isUnique) {
                if (uniqueness.index > 1) {
                    // If multiple matches exist, add an overall index to the final expression
                    finalXPath = `(${finalXPath})[${uniqueness.index}]`;
                }
                return finalXPath;
            }
        
            // If no unique path found, return a generic relative XPath
            return `//*[local-name()='${element.localName}']`;
        }


    
        // First, try to use text content if available
        let textXPath = getTextXPath(element);
        if (textXPath) {
            return textXPath;
        }
    
        let ancestorInfo = getAncestorWithUniqueAttribute(element);
        if (ancestorInfo) {
            let xpath = buildXPathFromAncestor(ancestorInfo, element);
            let uniqueness = isUniqueXPath(xpath, element);
            if (uniqueness.isUnique) {
                if (uniqueness.index > 1) {
                    xpath = `(${xpath})[${uniqueness.index}]`; // Add index if necessary
                }
                return xpath;
            }
        }
    
        // Try to find a unique attribute at the element level
        const attributes = ['id', 'name', 'type', 'value', 'class', 'title', 'alt', 'col-id', 'colid', 'ref', 'role', 'ng-bind', 'aria-label', 'formcontrolname'];
        for (let attr of attributes) {
            if (element.hasAttribute(attr)) {
                let attrValue = element.getAttribute(attr);
                let xpath;
    
                // Check if the attribute value ends with '_number'
                if (/_(\d+)$/.test(attrValue)) {
                    // Remove '_number' at the end
                    let modifiedAttrValue = attrValue.replace(/_(\d+)$/, '');
                    xpath = `//${element.tagName.toLowerCase()}[contains(@${attr}, ${escapeXPathString(modifiedAttrValue)})]`;
                } else {
                    xpath = `//${element.tagName.toLowerCase()}[@${attr}=${escapeXPathString(attrValue)}]`;
                }
    
                let uniqueness = isUniqueXPath(xpath, element);
                if (uniqueness.isUnique) {
                    if (uniqueness.index > 1) {
                        xpath = `(${xpath})[${uniqueness.index}]`; // Add index if necessary
                    }
                    return xpath;
                }
            }
        }
    
        // Fallback to relative XPath with indices
        return generateRelativeXPath(element);
    }