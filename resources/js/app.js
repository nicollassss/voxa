import './bootstrap';

import Alpine from 'alpinejs';
import chat from './chat';

window.Alpine = Alpine;
Alpine.data('chat', chat);

Alpine.start();
