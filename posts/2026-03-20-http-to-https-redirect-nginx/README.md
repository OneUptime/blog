# How to Set Up HTTP to HTTPS Redirection on Nginx

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Nginx, HTTPS, HTTP, TLS, Web Server, Security, Redirect

Description: Learn how to configure Nginx to automatically redirect all HTTP traffic to HTTPS for secure connections.

## Why Redirect HTTP to HTTPS?

Serving your application exclusively over HTTPS protects users from eavesdropping and man-in-the-middle attacks. Modern browsers flag HTTP sites as "Not Secure," and search engines favor HTTPS in rankings. Redirecting HTTP to HTTPS is one of the first steps in hardening any web server.

## Basic HTTP to HTTPS Redirect

The simplest approach is to listen on port 80 and issue a `301 Moved Permanently` redirect to the HTTPS equivalent.

```nginx
# /etc/nginx/sites-available/example.com

server {
    listen 80;
    listen [::]:80;
    server_name example.com www.example.com;

    # Redirect all HTTP requests to HTTPS with a 301
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name example.com www.example.com;

    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    root /var/www/html;
    index index.html;
}
```

The `$host` variable preserves the original hostname, and `$request_uri` carries the full path and query string, so bookmarks and deep links continue to work after the redirect.

## Using a Catch-All Server Block

If you host multiple virtual hosts and want a single catch-all block to redirect any HTTP request:

```nginx
# Catch-all HTTP block – redirects everything to HTTPS
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    # Placeholder name; default_server handles unmatched hosts
    server_name _;

    return 301 https://$host$request_uri;
}
```

The `default_server` parameter, not the order of `server` blocks, is what makes this the catch-all for that listen address and port.

## Excluding the ACME Challenge Path

When using Let's Encrypt / Certbot, the ACME HTTP-01 challenge must be accessible over HTTP. Exclude that path from the redirect:

```nginx
server {
    listen 80;
    server_name example.com www.example.com;

    # Allow Certbot to verify the domain over HTTP
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirect everything else to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}
```

## Testing the Redirect

After saving and reloading Nginx (`nginx -s reload`), verify the redirect using `curl`:

```bash
# -I fetches headers only; -L follows redirects
curl -I -L http://example.com
```

You should see an HTTP `301` response followed by a `200` on the HTTPS URL.

## Using HTTP Strict Transport Security (HSTS)

Once HTTPS is stable, add HSTS to tell browsers that have seen the header to use HTTPS for your domain:

```nginx
server {
    listen 443 ssl;
    server_name example.com www.example.com;

    # Tell browsers to enforce HTTPS for 1 year (31536000 seconds)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    root /var/www/html;
}
```

Start with a short `max-age` (e.g., 300 seconds) while testing, then increase to a year once everything is confirmed working.

## Conclusion

Redirecting HTTP to HTTPS in Nginx is a two-step process: add a server block that listens on port 80 and issues a `301` redirect, then ensure your HTTPS server block is correctly configured with a valid certificate. Pairing this with HSTS helps browsers continue using HTTPS after they have received the HSTS header.
