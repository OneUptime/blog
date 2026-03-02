# How to Set Up Nginx with GeoIP Module on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, NGINX, GeoIP, Security, Web Server

Description: Configure Nginx with the GeoIP module on Ubuntu to restrict access, redirect users, or customize content based on their geographic location.

---

Knowing where your traffic comes from opens up a range of possibilities: blocking regions known for abuse, serving localized content, or complying with geographic licensing restrictions. Nginx supports this through the GeoIP module, which maps IP addresses to countries and cities using MaxMind's databases.

## Choosing Between GeoIP and GeoIP2

There are two GeoIP modules for Nginx:

- `ngx_http_geoip_module` - uses the older GeoIP (v1) databases in `.dat` format. MaxMind stopped updating these in 2019.
- `ngx_http_geoip2_module` - uses the modern GeoIP2 databases in `.mmdb` format. This is the actively maintained option.

This guide covers GeoIP2, which you should use for any new setup.

## Installing Nginx and the GeoIP2 Module

On Ubuntu, the `libnginx-mod-http-geoip2` package provides the module:

```bash
sudo apt update
sudo apt install nginx libnginx-mod-http-geoip2 -y
```

Confirm the module is available:

```bash
nginx -V 2>&1 | grep -o with-http_geoip
ls /usr/lib/nginx/modules/ | grep geoip
```

## Getting the MaxMind GeoLite2 Databases

MaxMind requires a free account to download their databases. Register at https://www.maxmind.com/en/geolite2/signup and then:

```bash
# Install geoipupdate tool for automatic database updates
sudo apt install geoipupdate -y
```

Configure it with your MaxMind credentials:

```bash
sudo nano /etc/GeoIP.conf
```

Add your account details:

```
# Your MaxMind Account ID
AccountID YOUR_ACCOUNT_ID

# Your MaxMind License Key
LicenseKey YOUR_LICENSE_KEY

# Which databases to download
EditionIDs GeoLite2-Country GeoLite2-City
```

Run the update to download databases:

```bash
sudo geoipupdate
ls /var/lib/GeoIP/
# Should show GeoLite2-Country.mmdb and GeoLite2-City.mmdb
```

Set up automatic updates via cron:

```bash
# Update databases weekly on Wednesdays at 2am
echo "0 2 * * 3 root /usr/bin/geoipupdate" | sudo tee /etc/cron.d/geoipupdate
```

## Loading the GeoIP2 Module

The module needs to be loaded before use. Check if it is loaded automatically:

```bash
cat /etc/nginx/modules-enabled/50-mod-http-geoip2.conf
```

If the file does not exist, add the load directive to `nginx.conf`:

```nginx
# /etc/nginx/nginx.conf
load_module modules/ngx_http_geoip2_module.so;

http {
    # ...
}
```

## Configuring GeoIP2 in Nginx

Set up the database paths and variables in the `http` block:

```nginx
# /etc/nginx/nginx.conf or /etc/nginx/conf.d/geoip.conf

http {
    # Load country database
    geoip2 /var/lib/GeoIP/GeoLite2-Country.mmdb {
        # Create a variable $geoip2_country_code with the 2-letter country code
        $geoip2_country_code default=XX country iso_code;

        # Full country name
        $geoip2_country_name country names en;
    }

    # Load city database for more granular data
    geoip2 /var/lib/GeoIP/GeoLite2-City.mmdb {
        $geoip2_city city names en;
        $geoip2_region subdivisions 0 iso_code;
        $geoip2_latitude location latitude;
        $geoip2_longitude location longitude;
    }
}
```

## Blocking Countries

A common use case is blocking traffic from specific regions. Use a `map` to create a blocklist:

```nginx
http {
    # Map country code to block status
    # 0 = allowed, 1 = blocked
    map $geoip2_country_code $blocked_country {
        default 0;

        # Block specific countries by ISO code
        CN 1;  # China
        RU 1;  # Russia
        KP 1;  # North Korea
    }

    server {
        listen 80;
        server_name example.com;

        # Return 403 for blocked countries
        if ($blocked_country) {
            return 403 "Access from your region is not available.";
        }

        location / {
            root /var/www/html;
        }
    }
}
```

## Allowlisting Countries (Whitelist Approach)

For stricter control, block everything except specific countries:

```nginx
http {
    map $geoip2_country_code $allowed_country {
        default 0;  # Block all by default

        # Allow only these countries
        US 1;
        GB 1;
        CA 1;
        AU 1;
        DE 1;
    }

    server {
        listen 80;
        server_name internal-app.example.com;

        if ($allowed_country = 0) {
            return 403 "Service not available in your region.";
        }

        location / {
            proxy_pass http://localhost:8080;
        }
    }
}
```

## Redirecting Based on Country

Rather than blocking, redirect users to localized versions of your site:

```nginx
http {
    map $geoip2_country_code $locale_redirect {
        default         "";
        DE              "https://de.example.com";
        FR              "https://fr.example.com";
        JP              "https://jp.example.com";
        ES              "https://es.example.com";
    }

    server {
        listen 80;
        server_name example.com;

        # Redirect to localized site if a mapping exists
        if ($locale_redirect) {
            return 302 $locale_redirect$request_uri;
        }

        location / {
            root /var/www/html/en;
        }
    }
}
```

## Passing GeoIP Data to Backend Applications

Your application can receive country data as headers:

```nginx
server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://localhost:3000;

        # Pass geographic information to the backend
        proxy_set_header X-Country-Code $geoip2_country_code;
        proxy_set_header X-Country-Name $geoip2_country_name;
        proxy_set_header X-City $geoip2_city;
        proxy_set_header X-Region $geoip2_region;
        proxy_set_header X-Latitude $geoip2_latitude;
        proxy_set_header X-Longitude $geoip2_longitude;
    }
}
```

The backend can then use these headers for personalization, logging, or analytics without needing its own IP geolocation lookup.

## Rate Limiting by Country

Apply different rate limits based on geography:

```nginx
http {
    # Create a key that combines IP and country for rate limiting
    map $geoip2_country_code $rate_limit_key {
        default     $binary_remote_addr;
        # For high-risk regions, use a stricter key
        RU          "${binary_remote_addr}_strict";
        CN          "${binary_remote_addr}_strict";
    }

    # Normal rate: 30 requests/minute
    limit_req_zone $binary_remote_addr zone=normal:10m rate=30r/m;

    # Strict rate: 5 requests/minute
    limit_req_zone $rate_limit_key zone=strict:10m rate=5r/m;
}
```

## Logging Country Information

Add country codes to your access log for analysis:

```nginx
http {
    # Custom log format with geo data
    log_format geo_combined '$remote_addr - $geoip2_country_code [$time_local] '
                            '"$request" $status $body_bytes_sent '
                            '"$http_referer" "$http_user_agent"';

    access_log /var/log/nginx/access.log geo_combined;
}
```

Analyze the logs to see your traffic distribution:

```bash
# Count requests by country
awk '{print $3}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -20
```

## Testing the Configuration

```bash
# Test configuration syntax
sudo nginx -t

# Reload
sudo systemctl reload nginx

# Test with a specific IP (use curl with X-Forwarded-For if behind a load balancer)
# Or use the MaxMind test IPs from their documentation

# Check what country an IP resolves to
geoiplookup 8.8.8.8  # If geoipupdate installed this binary
```

The GeoIP2 module gives Nginx powerful geographic awareness. Combined with maps and conditional logic, you can build sophisticated routing and access control without touching your application code.
