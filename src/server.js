import http from 'node:http';
import { pageHtml } from './web/page.js';

function sendJson(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(value));
}

function isAuthorized(request, token) {
  return request.headers.authorization === `Bearer ${token}`;
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function validateLimit(value) {
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 20 || limit > 100) {
    throw new Error('Limit must be between 20 and 100');
  }
  return limit;
}

export async function startServer({ host = '127.0.0.1', port = 8765, config, backend, switcher, policy, stdout = process.stdout }) {
  if (!config.token) {
    throw new Error('Web token is not configured. Run: maccharge config set-token <token>');
  }

  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

      if (request.method === 'GET' && url.pathname === '/') {
        response.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
        });
        response.end(pageHtml);
        return;
      }

      if (!url.pathname.startsWith('/api/')) {
        sendJson(response, 404, { error: 'Not found' });
        return;
      }

      if (!isAuthorized(request, config.token)) {
        sendJson(response, 401, { error: 'Unauthorized' });
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/status') {
        sendJson(response, 200, await backend.status());
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/policy') {
        sendJson(response, 200, await policy.status());
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/policy/pause') {
        sendJson(response, 200, await policy.pause());
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/policy/resume') {
        sendJson(response, 200, await policy.resume());
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/policy/limit') {
        const body = await readJson(request);
        sendJson(response, 200, await policy.setLimitEnabled({
          enabled: Boolean(body.enabled),
          limit: body.enabled ? validateLimit(body.limit) : undefined,
        }));
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/policy/switcher') {
        const body = await readJson(request);
        sendJson(response, 200, await policy.setSwitcherEnabled({
          enabled: Boolean(body.enabled),
          limit: body.enabled ? validateLimit(body.limit) : undefined,
        }));
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/switcher') {
        sendJson(response, 200, await switcher.status());
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/switcher/on') {
        const body = await readJson(request);
        sendJson(response, 200, await switcher.on({ limit: validateLimit(body.limit) }));
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/switcher/off') {
        sendJson(response, 200, await switcher.off());
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/limit') {
        const body = await readJson(request);
        sendJson(response, 200, await backend.setLimit(validateLimit(body.limit)));
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/enable') {
        sendJson(response, 200, policy ? await policy.resume() : await backend.enable());
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/disable') {
        sendJson(response, 200, policy ? await policy.pause() : await backend.disable());
        return;
      }

      sendJson(response, 404, { error: 'Not found' });
    } catch (error) {
      sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.off('error', reject);
      resolve();
    });
  });

  const address = server.address();
  stdout.write(`MacCharge web server listening on http://${host}:${address.port}\n`);
  stdout.write('Anyone on the network with the token can control charging.\n');
  return server;
}
