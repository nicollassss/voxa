import Echo from 'laravel-echo';

import Pusher from 'pusher-js';

export function createEcho(config) {
    window.Pusher = Pusher;
    const options = {
        broadcaster: config.broadcaster,
        key: config.key,
        cluster: config.cluster,
        forceTLS: config.tls,
        //sem fallback para http pq o chat eh so websocket
        enabledTransports: ['ws', 'wss'],
        authEndpoint: '/broadcasting/auth',
        auth: { headers: { 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content } },
    };

    if (config.broadcaster === 'reverb') {
        Object.assign(options, { wsHost: config.host, wsPort: config.port, wssPort: config.port });
    }

    return new Echo(options);
}
