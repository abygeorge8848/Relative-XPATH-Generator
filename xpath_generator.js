if (!window.hasInjected) {
    window.hasInjected = true;

    document.addEventListener('contextmenu', function (e) {
        e.preventDefault(); // Prevents the browser's context menu from showing up
        var xpath = computeXPath(e.target);
        console.log(`You have right clicked on : \n ${xpath}`);
    });


    function computeXPath(element) {
        if (!element) return null;

        function escapeXPathString(str) {
            if (!str.includes("'")) return `'${str}'`;
            if (!str.includes('"')) return `"${str}"`;
            let parts = str.split("'");
            let delimiter = `, "'", `
            let xpathString = "concat(";
            for (let i = 0; i < parts.length; i++) {
                xpathString += `'${parts[i]}'`;
                xpathString += delimiter;
            }

            // Deletes delimiter for final element
            xpathString = xpathString.substring(0, parts.length - delimiter.length)
            xpathString += ")";

            return xpathString;
        }

        function isUniqueByAttribute(element, attrName) {
            let attrValue = element.getAttribute(attrName);
            if (!attrValue) return false;
            let xpath = `//${element.tagName.toLowerCase()}[@${attrName}=${escapeXPathString(attrValue)}]`;
            let result;

            try {
                result = document.evaluate("count(" + xpath + ")", document, null, XPathResult.ANY_TYPE, null).numberValue === 1;
                return result
            } catch (err) {
                console.log('WARNING: Element seems to not have any unique attributes.')
                return null
            }

        }

        function isUniqueByText(element) {
            let text = element.textContent.trim();
            if (!text) return false;
            let xpath = `//${element.tagName.toLowerCase()}[contains(text(), ${escapeXPathString(text)})]`;
            let result;

            try {
                result = document.evaluate("count(" + xpath + ")", document, null, XPathResult.ANY_TYPE, null).numberValue === 1;
                return result;
            } catch (err) {
                console.log('WARNING: Element seems to not have any unique text.')
                return null
            }
        }

        // Function to generate a unique XPath using parent attributes
        function generateRelativeXPath(element) {
            var paths = [];
            var currentElement = element;

            while (currentElement && currentElement.nodeType === 1) {
                let uniqueAttributeXPath = getUniqueAttributeXPath(currentElement);
                if (uniqueAttributeXPath) {
                    paths.unshift(uniqueAttributeXPath);
                    break; // Break the loop if a unique attribute is found
                }

                let tagName = currentElement.tagName.toLowerCase();
                let index = 1;
                for (let sibling = currentElement.previousElementSibling; sibling; sibling = sibling.previousElementSibling) {
                    if (sibling.nodeType === 1 && sibling.tagName === currentElement.tagName) {
                        ++index
                    }
                }
                let pathIndex = (index > 1 ? `[${index}]` : '');
                paths.unshift(`${tagName}${pathIndex}`);

                currentElement = currentElement.parentNode;
            }

            return paths.length ? `//${paths.join('//')}` : null;
        }

        function getUniqueAttributeXPath(element) {
            const attributes = ['id', 'name', 'type', 'value', 'title', 'alt', 'col-id', 'colid', 'ref', 'role', 'ng-bind'];
            for (let attr of attributes) {
                if (isUniqueByAttribute(element, attr)) {
                    return `${element.tagName.toLowerCase()}[@${attr}='${element.getAttribute(attr)}']`;
                }
            }
            return null;
        }

        // Special handling for svg elements
        if (element.tagName.toLowerCase() === 'svg' || element.tagName.toLowerCase() === 'path') {
            let parentElement = element.parentElement;
            if (!parentElement) return null;

            let parentXPath = computeXPath(parentElement);
            if (!parentXPath) return null;


            if (parentXPath.startsWith('//')) {
                return parentXPath;
            } else if (parentXPath.startsWith('/')) {
                return '/' + parentXPath;
            }

            return '//' + parentXPath;
        }

        const attributes = ['id', 'name', 'type', 'value', 'title', 'alt', 'col-id', 'colid', 'ref', 'role', 'ng-bind', 'ng-click'];
        for (let attr of attributes) {
            if (isUniqueByAttribute(element, attr)) {
                return `//${element.tagName.toLowerCase()}[@${attr}='${element.getAttribute(attr)}']`;
            }
        }

        if (element.className && typeof element.className === 'string') {
            let classes = element.className.trim().split(/\s+/);
            let combinedClassSelector = classes.join('.');
            let xpath = `//${element.tagName.toLowerCase()}[contains(@class, '${combinedClassSelector}')]`;
            if (document.evaluate("count(" + xpath + ")", document, null, XPathResult.ANY_TYPE, null).numberValue === 1) {
                return xpath;
            }
        }

        if (element.tagName.toLowerCase() !== 'i' && isUniqueByText(element)) {
            return `//${element.tagName.toLowerCase()}[contains(text(), ${escapeXPathString(element.textContent.trim())})]`;
        }

        return generateRelativeXPath(element);
    }

}