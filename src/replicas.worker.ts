import type { Parameters } from './motor';
import { replicate } from './replicas';

self.onmessage = (event: MessageEvent<Parameters>) => self.postMessage(replicate(event.data));
