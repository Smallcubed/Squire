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
import { Squire } from './Editor';

//  Squire comes from the packages imported using the package.json

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
    
    hasAncestorWithID(
        node: Node,
        id: string
    ): Boolean {
        while (node) {
            if ((node.nodeType == Node.ELEMENT_NODE) && (node.id === id)) {
                return true;
            }
            node = node.parentNode;
        }
        return false;
    };
    
    
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
        
        let editingNode = document.getElementById('SCEditingContainer');
        let iter = document.createNodeIterator(editingNode, NodeFilter.SHOW_TEXT,
             (node) =>
             this.hasAncestorWithID(node, 'SCSignatureContainer')
              ? NodeFilter.FILTER_REJECT
              : NodeFilter.FILTER_ACCEPT
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
                if (element.id === 'SCSignatureContainer') {
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
                    tag: 'SPAN', 
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
                          tag: 'SPAN',
                          attributes: {
                              class: className,
                              style: 'font-family: ' + familyName + '; font-size: ' + size,
                          },
                      }
                    : null,
                {
                    tag: 'SPAN',
                    attributes: { class: className },
                },
                aRange,
                null,
                shouldReplaceAll,
            );
        }
        return familyName ? 'false' : 'true';
    }

    moveDirectionForToken(self: Squire, event: KeyboardEvent, range: Range, moveUp: Boolean): void {
        
        // Allow right arrow to always break out of <code> block.
        const root = self.getRoot();
        if (rangeDoesStartAtBlockBoundary(range, root)) {
            let startBlock: Node | null = getStartBlockOfRange(range, root);
            let node: Node | null = startBlock;
            do {
                if ((node.nodeName === 'SPAN') && node.hasAttribute('sc-type')) {
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
                node.nodeName === 'SPAN' &&
                node.hasAttribute('sc-type')
            );
        }
        // else {
        //     let node: Node | null = range.endContainer;
        //     let offset = range.endOffset;
        //     let currBlock: Node | null = getStartBlockOfRange(range);
        //     if ((node.nodeName === 'SPAN') && (node.className === 'sc-line-end-blank')) {
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
