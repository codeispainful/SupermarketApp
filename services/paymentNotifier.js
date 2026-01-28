const EventEmitter = require('events');

class PaymentNotifier extends EventEmitter {
    subscribe(captureId, res) {
        const handler = (data) => {
            try {
                res.write(`data: ${JSON.stringify(data)}\n\n`);
            } catch (e) {
                // ignore write errors
            }
            // close after sending final event
            try { res.end(); } catch (e) { }
        };

        this.once(captureId, handler);

        // cleanup if client disconnects
        reqOnClose(res, () => {
            this.removeListener(captureId, handler);
        });
    }

    notify(captureId, data) {
        this.emit(captureId, data);
    }
}

function reqOnClose(res, cb) {
    // In SSE the request object is not directly available; rely on res.socket
    if (res && res.on) {
        res.on('close', cb);
        res.on('finish', cb);
    } else if (res && res.socket && res.socket.on) {
        res.socket.on('close', cb);
    }
}

module.exports = new PaymentNotifier();
