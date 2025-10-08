import type { Squire } from '../Editor';
import { tryLinkifyAfterWS } from './KeyHelpers';

// ---

const Enter = (self: Squire, event: KeyboardEvent, range: Range): void => {
    tryLinkifyAfterWS(self, range);
};

// ---

export { Enter };
