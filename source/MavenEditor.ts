import {
    moveRangeBoundariesDownTree,
    isNodeContainedInRange,
    moveRangeBoundaryOutOf,
    moveRangeBoundariesUpTree,
} from './range/Boundaries';
import {
    getStartBlockOfRange,
    getEndBlockOfRange,
    rangeDoesStartAtBlockBoundary,
    rangeDoesEndAtBlockBoundary,
} from './range/Block';
import {
    getNextBlock,
    getPreviousBlock,
    isEmptyBlock,
} from './node/Block';
import {
    isLeaf,
    isInline,
    isContainer,
    isBlock,
} from './node/Category';
import {
    hasAncestorWithID,
} from './node/Node';
import { Squire } from './Editor';

//  Squire comes from the packages imported using the package.json

//  These are defined in the Application EditingScripts.js file
// const SC_SIG_CONTAINER_ID = 'SCSignatureContainer';
// const SC_BLOCK_TAG = '?';
// const SC_EDITING_CONTAINER_ID = 'SCEditingContainer';
// const SC_TOKEN_TAG_KEY = 'span';
// const SC_TYPE_KEY = 'sc-type';
// const SC_LINE_END_CLASS = 'sc-line-end-blank';
// const SC_BR_CLASS = 'sc-editing-enabler';


class MavenEditor extends Squire {
    constructor(root: HTMLElement, config?: Partial<SquireConfig>) {
        super(root, config);
    }
    
    //  Simple pass through functions
    isLeaf(node: Node): Boolean {
        return isLeaf(node);
    }

    isInline(node: Node): Boolean {
        return isInline(node);
    }

    isContainer(node: Node): Boolean {
        return isContainer(node);
    }

    isBlock(node: Node): Boolean {
        return isBlock(node);
    }

    _makeConfig(userConfig?: object): SquireConfig {
        var config = super._makeConfig(userConfig);
        const extendedConfig = {
            avoidSlashyReplacements: true
        }
        Object.assign(extendedConfig, config);
        return extendedConfig;
    }

    _beforeInput(event: InputEvent): void {
        switch (event.inputType) {
            case 'insertParagraph':
                if (this._config.avoidSlashyReplacements) {
                    let range = this.getSelection();
                    if (range.collapsed && (range.endContainer.nodeType == Node.TEXT_NODE)) {
                        let text = range.endContainer.textContent;
                        let lastWord = text.split(' ').pop();
                        if (lastWord && lastWord.includes('/')) {
                            return;
                        }
                    }
                    event.preventDefault();
                    this.splitBlock(false);
                    return;
                }
                break;
        }
        super._beforeInput(event);
    }
    
    moveDown(range: Range): null {
        moveRangeBoundariesDownTree(range);
    }
    
    //  Override of change format to adjust around tokens
    changeFormat(
        add: { tag: string; attributes?: Record<string, string> } | null,
        remove?: { tag: string; attributes?: Record<string, string> } | null,
        range?: Range,
        partial?: boolean,
        ignoreSel?: boolean,
    ): Squire {
        //  Let it perform the normal behavior
        super.changeFormat(add, remove, range, partial, ignoreSel);
        //  Then make fix ups of formatting in tokens
        let tokens = document.querySelectorAll(`${SC_TOKEN_TAG_KEY}[${SC_TYPE_KEY}]`);
        for (let token of tokens) {
            this.scExtractFormatOutsideToken(token);
        }
        return this;
    }
    
    scExtractFormatOutsideToken(
        element: Element
    ): null {
        //  Ensure that it is a token and that it doesn't contain only text
        if ((element.tagName.toLowerCase() != SC_TOKEN_TAG_KEY) && 
            !(element.hasAttribute(SC_TYPE_KEY)) &&
            (element.firstChild.nodeType != Node.ELEMENT_NODE)) {
            return;
        }
        //  If the child is a font element (formatting), and it has only one text node, then we want to move it.
        let child = element.firstChild;
        let grandChild = child.firstChild;
        if ((child.className == 'font') &&
            (child.childNodes.length == 1) &&
            (grandChild.nodeType == Node.TEXT_NODE)) {
            let parent = element.parentElement;
            var shouldMove = true;
            //  Unless the parent is a format element and has the same values
            let parentStyle = parent.getAttribute('style');
            let childStyle = child.getAttribute('style');
            if ((parent.className == 'font') &&
                (parentStyle.toLowerCase() === childStyle.toLowerCase())) {
                    shouldMove = false;
            }
            
            //  First move the grand child text node to the element
            element.appendChild(grandChild);
            
            //  If we should move the formatting, put child before the element and append the element into it
            if (shouldMove)  {
                parent.insertBefore(child, element);
                child.appendChild(element);
            }
            //  Otherwise, just delete it
            else {
                element.removeChild(child);
            }
        }
    }
    
    scSetFontFaceSize(name: String, size: String, replaceAll: String): String {
        const shouldReplaceAll = (replaceAll.toLowerCase() === 'true');
        //  Look at all of the text nodes inside the editing container (excluding the signature)
        //  If all of them are inside the selection, then we are replacing all
        var selRange = this.getSelection();
        
        //  If the range is not collapsed and is at a boundary, ensure that we move up the tree
        const root = this.getRoot();
        if (!selRange.collapsed && rangeDoesStartAtBlockBoundary(selRange, root)) {
            moveRangeBoundariesUpTree(selRange, root, root, root);
        }
        
        let editingNode = document.getElementById(SC_EDITING_CONTAINER_ID);
        let iter = document.createNodeIterator(editingNode, NodeFilter.SHOW_TEXT,
             (node) =>
             hasAncestorWithID(node, SC_EDITING_CONTAINER_ID)
              ? NodeFilter.FILTER_ACCEPT
              : NodeFilter.FILTER_REJECT
        );
        
        //  Look through all those nodes
        var allInside = true;
        let currentNode;
        while ((currentNode = iter.nextNode())) {
            if (!isNodeContainedInRange(selRange, currentNode, false)) {
                allInside = false;
                break;
            }
        }
        
        //  If replaceAll was set, make the range select all of the editingContainer,
        //  excluding the signature container, if there
        var changingRanges = [selRange];
        if (shouldReplaceAll) {
            var firstGroup = [];
            var lastGroup = [];
            var sigEl = null;
            for (let element of editingNode.children) {
                if (element.id === SC_SIG_CONTAINER_ID) {
                    sigEl = element;
                }
                else if (sigEl) {
                    lastGroup.push(element);
                }
                else {
                    firstGroup.push(element);
                }
            }
            var x = firstGroup.length - 1;
            if (x >= 0) {
                let firstRange = document.createRange();
                firstRange.setStart(firstGroup[0], 0);
                firstRange.setEnd(firstGroup[x], firstGroup[x].childNodes.length);
                changingRanges = [firstRange];
                if (lastGroup.length > 0) {
                    x = lastGroup.length - 1;
                    let lastRange = document.createRange();
                    lastRange.setStart(lastGroup[0], 0);
                    lastRange.setEnd(lastGroup[x], 1);
                    changingRanges.push(lastRange);
                }
            }
        }
        
        //  Determine if we are just removing formatting.
        var familyName = name;
        if (shouldReplaceAll || allInside) {
            familyName = null;
        }

        for (let aRange of changingRanges) {
            //  Removes any existing bad size formatting.
            this.changeFormat(null, 
                {
                    tag: SC_TOKEN_TAG_KEY, 
                    attributes: { class: this._config.classNames.fontSize }, 
                },
                aRange,
                null,
                shouldReplaceAll,
            );
            const className = this._config.classNames.fontFamily;
            this.changeFormat(
                familyName
                    ? {
                          tag: SC_TOKEN_TAG_KEY,
                          attributes: {
                              class: className,
                              style: 'font-family: ' + familyName + '; font-size: ' + size,
                          },
                      }
                    : null,
                {
                    tag: SC_TOKEN_TAG_KEY,
                    attributes: { class: className },
                },
                aRange,
                null,
                shouldReplaceAll,
            );
        }
        return familyName ? 'false' : 'true';
    }

    //	Splits a document at the top level based on the range passed in
    //	and returns a node after the break.
    splitDocument(range: Range): Element | null {
        let mainContainer = document.getElementById(SC_EDITING_CONTAINER_ID);
        if (!mainContainer) {
            return null;
        }
        let beforeRange = document.createRange();
        beforeRange.setStart(mainContainer.firstChild, 0);
        beforeRange.setEnd(range.startContainer, range.startOffset);
        
        let afterRange = document.createRange();
        afterRange.setStart(range.endContainer, range.endOffset);
        let endNode = mainContainer.lastChild;
        afterRange.setEnd(endNode, endNode.childNodes.length);
        
        //	Make two fragments from those ranges
        let beforeFrag = beforeRange.extractContents();
        let afterFrag = afterRange.extractContents();
        
        //	clear the content
        mainContainer.innerHTML = "";
    
        //	Add back the first part
        for (let i = 0; i < beforeFrag.childNodes.length; ) {
            let item = beforeFrag.childNodes[i];
            if (item.nodeType == Node.TEXT_NODE) {
                let paragraph = document.createElement(SC_BLOCK_TAG);
                paragraph.append(item);
                mainContainer.append(paragraph);
            }
            else {
                mainContainer.append(item);
            }
        }
        //	Add the second part noting the first node as the one after the break to return
        var doneFirst = false;
        let afterNode = null;
    
        for (let i = 0; i < afterFrag.childNodes.length; ) {
            let item = afterFrag.childNodes[i];
            if (item.nodeType == Node.TEXT_NODE) {
                let paragraph = document.createElement(SC_BLOCK_TAG);
                paragraph.append(item);
                mainContainer.append(paragraph);
            }
            else {
                mainContainer.append(item);
            }
            if (!doneFirst) {
                afterNode = mainContainer.lastChild;
                doneFirst = true;
            }
        }
    
        return afterNode;
    }

    moveDirectionForToken(self: Squire, event: KeyboardEvent, range: Range, moveUp: Boolean): void {
        
        // Allow right arrow to always break out of <code> block.
        const root = self.getRoot();
        if (rangeDoesStartAtBlockBoundary(range, root)) {
            let startBlock: Node | null = getStartBlockOfRange(range, root);
            let node: Node | null = startBlock;
            do {
                if ((node.nodeName.toLowerCase() === SC_TOKEN_TAG_KEY) && node.hasAttribute(SC_TYPE_KEY)) {
                    let destBlock = moveUp ? getPreviousBlock(startBlock, root) : getNextBlock(startBlock, root);
                    if (destBlock) {
                        range.setStart(destBlock, 0);
                        range.collapse(true);
                        self.setSelection(range);
                        event.preventDefault();
                    }
                    break;
                }
                node = node.firstChild;
            } while (
                node.nodeName.toLowerCase() === SC_TOKEN_TAG_KEY &&
                node.hasAttribute(SC_TYPE_KEY)
            );
        }
        // else {
        //     let node: Node | null = range.endContainer;
        //     let offset = range.endOffset;
        //     let currBlock: Node | null = getStartBlockOfRange(range);
        //     if ((node.nodeName.toLowerCase() === SC_TOKEN_TAG_KEY) && (node.className === SC_LINE_END_CLASS)) {
        //         let destBlock = moveUp ? getPreviousBlock(currBlock, root) : getNextBlock(currBlock, root);
        //         if (destBlock) {
        //             let destLength = destBlock.childNodes.length;
        //             let destOffset = (offset < destLength) ? offset : destLength;
        //             range.setStart(destBlock, destOffset);
        //             range.collapse(true);
        //             self.setSelection(range);
        //             event.preventDefault();
        //         }
        //     }
        // }
        
    }
}


export { Squire };
export type { SquireConfig };
export { MavenEditor };

(window as any).MavenEditor = MavenEditor;
