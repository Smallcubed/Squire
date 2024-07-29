import {
    moveRangeBoundariesDownTree,
    isNodeContainedInRange,
    moveRangeBoundaryOutOf,
    moveRangeBoundariesUpTree,
} from './range/Boundaries';
import { Squire } from './Editor';

//  Squire comes from the packages imported using the package.json

class MavenEditor extends Squire {
    constructor(root: HTMLElement, config?: Partial<SquireConfig>) {
        super(root, config);
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
        const className = this._config.classNames.fontFamily;
        //  Look at all of the text nodes inside the editing container (excluding the signature)
        //  If all of them are inside the selection, then we are replacing all
        var selRange = this.getSelection();
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
            if (!selRange.intersectsNode(currentNode)) {
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
                firstRange.setEnd(firstGroup[x], 1);
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

}


export { Squire };
export type { SquireConfig };
export { MavenEditor };

(window as any).MavenEditor = MavenEditor;
