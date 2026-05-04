# How to Configure Nginx GeoIP2 Module with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Nginx, GeoIP2, IPv6, MaxMind, Geolocation, Web Security, Traffic Routing

Description: Configure the Nginx GeoIP2 module to geolocate IPv6 clients using MaxMind GeoLite2 databases for geographic traffic routing, content personalization, and security rules.

---

The Nginx GeoIP2 module uses MaxMind databases to determine the geographic location of clients. MaxMind's GeoLite2 and GeoIP2 databases include IPv6 records, making geolocation work seamlessly for IPv6 clients.

## Installing Nginx with GeoIP2 Module

```bash
# Ubuntu/Debian - install ngx_http_geoip2_module

sudo apt install nginx libnginx-mod-http-geoip2 -y

# Or install libmaxminddb and compile from source
sudo apt install libmaxminddb-dev -y

# RHEL/CentOS - install build deps and compile the third-party
# ngx_http_geoip2_module (https://github.com/leev/ngx_http_geoip2_module)
# as a dynamic module against your nginx version
sudo dnf install libmaxminddb-devel -y

# Verify module is available
nginx -V 2>&1 | grep geoip2
```

## Downloading MaxMind GeoLite2 Databases

```bash
# Install geoipupdate tool
sudo apt install geoipupdate -y

# Configure with MaxMind account (free signup required)
cat > /etc/GeoIP.conf << 'EOF'
AccountID YOUR_ACCOUNT_ID
LicenseKey YOUR_LICENSE_KEY
EditionIDs GeoLite2-City GeoLite2-Country GeoLite2-ASN
EOF

# Download databases
sudo geoipupdate

# Databases stored at:
ls /usr/share/GeoIP/
# GeoLite2-City.mmdb
# GeoLite2-Country.mmdb
# GeoLite2-ASN.mmdb
```

## Nginx GeoIP2 Configuration for IPv6

```nginx
# /etc/nginx/nginx.conf

load_module modules/ngx_http_geoip2_module.so;

http {
    # GeoIP2 database configuration
    geoip2 /usr/share/GeoIP/GeoLite2-Country.mmdb {
        auto_reload 60m;  # Reload database every 60 minutes

        # Country code (works for both IPv4 and IPv6 clients)
        $geoip2_data_country_code country iso_code;
        $geoip2_data_country_name country names en;

        # Continent
        $geoip2_data_continent_code continent code;
    }

    geoip2 /usr/share/GeoIP/GeoLite2-City.mmdb {
        $geoip2_data_city_name city names en;
        $geoip2_data_latitude location latitude;
        $geoip2_data_longitude location longitude;
        $geoip2_data_timezone location time_zone;
    }

    geoip2 /usr/share/GeoIP/GeoLite2-ASN.mmdb {
        $geoip2_data_asn autonomous_system_number;
        $geoip2_data_org autonomous_system_organization;
    }

    server {
        # Listen on both IPv4 and IPv6
        listen 80;
        listen [::]:80;

        server_name yourdomain.com;

        location / {
            # Pass geo data to backend
            proxy_set_header X-Country-Code  $geoip2_data_country_code;
            proxy_set_header X-Country-Name  $geoip2_data_country_name;
            proxy_set_header X-City-Name     $geoip2_data_city_name;
            proxy_set_header X-Client-ASN    $geoip2_data_asn;

            proxy_pass http://backend;
        }
    }
}
```

## Blocking Countries via GeoIP2 (IPv6 Aware)

```nginx
# /etc/nginx/conf.d/geoip-block.conf

# Map country codes to block decision
map $geoip2_data_country_code $blocked_country {
    default   0;
    CN        1;  # China
    RU        1;  # Russia
    KP        1;  # North Korea
}

server {
    listen [::]:80;
    server_name yourdomain.com;

    # Block by geography (works for IPv6 clients automatically)
    if ($blocked_country) {
        return 403 "Access denied from your region";
    }

    location / {
        root /var/www/html;
    }
}
```

## Routing Traffic by Geography with IPv6

```nginx
# Route users to regional backends based on GeoIP
map $geoip2_data_continent_code $regional_backend {
    EU      eu_backend;
    NA      us_backend;
    AS      asia_backend;
    default global_backend;
}

upstream eu_backend    { server [2001:db8:eu::1]:8080; }
upstream us_backend    { server [2001:db8:us::1]:8080; }
upstream asia_backend  { server [2001:db8:asia::1]:8080; }
upstream global_backend { server [2001:db8:global::1]:8080; }

server {
    listen [::]:80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://$regional_backend;
        proxy_set_header X-Region $geoip2_data_continent_code;
    }
}
```

## Testing GeoIP2 with IPv6 Addresses

```bash
# Test GeoIP2 lookup for an IPv6 address directly
python3 -c "
import maxminddb
with maxminddb.open_database('/usr/share/GeoIP/GeoLite2-Country.mmdb') as reader:
    record = reader.get('2001:4860:4860::8888')  # Google DNS IPv6
    print('Country:', record.get('country', {}).get('iso_code'))
    print('Continent:', record.get('continent', {}).get('code'))
"

# Test via curl to verify Nginx headers
curl -6 http://yourdomain.com/ -I | grep "X-Country\|X-City"

# Check Nginx logs for geo data
tail -f /var/log/nginx/access.log
```

MaxMind's GeoIP2 databases include comprehensive IPv6 records, making the GeoIP2 Nginx module an effective way to implement geographic routing, content personalization, and security policies for both IPv4 and IPv6 clients.
