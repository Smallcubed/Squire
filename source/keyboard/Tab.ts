import {
    rangeDoesStartAtBlockBoundary,
    getStartBlockOfRange,
} from '../range/Block';
import { getNearest } from '../node/Node';

import type { Squire } from '../Editor';
import { CreateList } from './Space';

// ---

const Tab = (self: Squire, event: KeyboardEvent, range: Range): void => {
    const root = self._root;
    var shouldInsertTab = true;
    self._removeZWS();
    // If no selection and at start of block
    if (range.collapsed && rangeDoesStartAtBlockBoundary(range, root)) {
        let node: Node = getStartBlockOfRange(range, root)!;
        // Iterate through the block's parents
        let parent: Node | null;
        while ((parent = node.parentNode)) {
            // If we find a UL or OL (so are in a list, node must be an LI)
            if (parent.nodeName === 'UL' || parent.nodeName === 'OL') {
                // Then increase the list level
                event.preventDefault();
                self.increaseListLevel(range);
                shouldInsertTab = false;
                break;
            }
            node = parent;
        }
    }
    
    //  Create a list if it is appropriate
    if (CreateList(self, event, range, root)) {
        return;
    }
    
    //  Should we actually insert a tab?
    if (shouldInsertTab) {
        event.preventDefault();
        //  Insert a literal tab character
        self.insertPlainText("   ", false);
    }
};

const ShiftTab = (self: Squire, event: KeyboardEvent, range: Range): void => {
    const root = self._root;
    self._removeZWS();
    // If no selection and at start of block
    if (range.collapsed && rangeDoesStartAtBlockBoundary(range, root)) {
        // Break list
        const node = range.startContainer;
        if (getNearest(node, root, 'UL') || getNearest(node, root, 'OL')) {
            event.preventDefault();
            self.decreaseListLevel(range);
        }
    }
};

// ---

export { Tab, ShiftTab };
