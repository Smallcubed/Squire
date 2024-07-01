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
    
}


export { Squire };
export type { SquireConfig };
export { MavenEditor };

(window as any).MavenEditor = MavenEditor;
