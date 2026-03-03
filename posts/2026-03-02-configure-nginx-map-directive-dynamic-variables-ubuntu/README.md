# How to Configure Nginx Map Directive for Dynamic Variables on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, NGINX, Configuration, Web Server, Performance

Description: Use the Nginx map directive to create dynamic variables based on request attributes, enabling clean, efficient configuration for routing, redirects, and access control.

---

The `map` directive is one of Nginx's most powerful and underused configuration tools. It creates a variable whose value is determined by looking up another variable in a mapping table. Maps are evaluated lazily (only when the variable is used) and are much more efficient than long chains of `if` statements. They also keep configuration files readable as rule sets grow.

## How the map Directive Works

The map block lives in the `http` context and looks like this:

```nginx
map $source_variable $target_variable {
    default        fallback_value;
    match_value    result_value;
    match_value2   result_value2;
}
```

When `$target_variable` is referenced in a `server` or `location` block, Nginx evaluates the map and sets `$target_variable` to the appropriate value based on `$source_variable`. If no match is found, it uses the `default` value.

## Basic Backend Routing

Route requests to different backends based on the request URI:

```nginx
http {
    # Map URL paths to backend addresses
    map $uri $backend {
        default                      "http://127.0.0.1:3000";
        ~^/api/v1/                   "http://127.0.0.1:3001";
        ~^/api/v2/                   "http://127.0.0.1:3002";
        ~^/static/                   "http://127.0.0.1:9000";
        ~^/admin/                    "http://127.0.0.1:8080";
    }

    server {
        listen 80;
        server_name example.com;

        location / {
            proxy_pass $backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
```

The `~` prefix marks a case-sensitive regex match. Use `~*` for case-insensitive matching.

## Host-Based Routing (Virtual Hosting Alternative)

Route requests to different applications based on the HTTP Host header:

```nginx
http {
    map $host $app_backend {
        default              "http://127.0.0.1:3000";
        "api.example.com"    "http://127.0.0.1:3001";
        "app.example.com"    "http://127.0.0.1:3002";
        "docs.example.com"   "http://127.0.0.1:3003";
        ~^staging\.          "http://127.0.0.1:4000";  # Match any staging. subdomain
    }

    server {
        listen 80;
        server_name ~.+;  # Match any hostname

        location / {
            proxy_pass $app_backend;
            proxy_set_header Host $host;
        }
    }
}
```

## User-Agent-Based Behavior

Serve different content or apply different settings based on the browser or client:

```nginx
http {
    # Detect mobile browsers
    map $http_user_agent $is_mobile {
        default    0;
        ~*(android|iphone|ipad|mobile)    1;
    }

    # Choose backend based on device type
    map $is_mobile $mobile_backend {
        default    "http://127.0.0.1:3000";  # Desktop backend
        1          "http://127.0.0.1:3001";  # Mobile-optimized backend
    }

    # Set cache duration based on device
    map $is_mobile $cache_duration {
        default    "3600";
        1          "1800";
    }

    server {
        listen 80;
        server_name example.com;

        location / {
            proxy_pass $mobile_backend;
            add_header X-Cache-Duration $cache_duration;
            add_header X-Is-Mobile $is_mobile;
        }
    }
}
```

## Country-Based Routing with GeoIP

Combine GeoIP variables with map for geographic routing:

```nginx
http {
    # Map country codes to backends (requires GeoIP module)
    map $geoip2_data_country_code $regional_backend {
        default    "http://us-backend.example.com";
        EU         "http://eu-backend.example.com";
        DE         "http://de-backend.example.com";
        JP         "http://jp-backend.example.com";
        AU         "http://au-backend.example.com";
    }

    # Map countries to cache zones
    map $geoip2_data_country_code $cache_zone {
        default    "us_cache";
        ~^(DE|FR|GB|IT|ES)    "eu_cache";
        ~^(JP|CN|KR|SG)       "asia_cache";
    }

    server {
        listen 80;
        server_name example.com;

        location / {
            proxy_pass $regional_backend;
            proxy_cache $cache_zone;
        }
    }
}
```

## Redirect Mapping

Manage large-scale URL redirects cleanly using a map:

```nginx
http {
    # Define old URL to new URL mappings
    map $uri $redirect_target {
        default    "";  # Empty means no redirect

        "/old-page"                   "/new-page";
        "/products/old-category"      "/products/new-category";
        "/blog/2020/old-post"         "/blog/new-post";
        ~^/legacy/(.+)$               "/modern/$1";  # Pattern capture
    }

    server {
        listen 80;
        server_name example.com;

        location / {
            # Only redirect if the map returned a non-empty target
            if ($redirect_target != "") {
                return 301 $redirect_target;
            }

            # Normal request handling
            root /var/www/html;
            try_files $uri $uri/ /index.html;
        }
    }
}
```

Note: While `if` is generally discouraged in Nginx location blocks, using it to check a variable set by a map is one of the safe patterns.

## Request Method Filtering

Allow or deny based on HTTP method:

```nginx
http {
    # Map request methods to allowed status
    map $request_method $method_allowed {
        default    0;
        GET        1;
        HEAD       1;
        POST       1;
        OPTIONS    1;
    }

    # Stricter API endpoint rules
    map $request_method $api_method_allowed {
        default    0;
        GET        1;
        POST       1;
        PUT        1;
        DELETE     1;
        PATCH      1;
    }

    server {
        listen 80;
        server_name example.com;

        location / {
            if ($method_allowed = 0) {
                return 405;
            }
            root /var/www/html;
        }

        location /api/ {
            if ($api_method_allowed = 0) {
                return 405;
            }
            proxy_pass http://127.0.0.1:3000;
        }
    }
}
```

## Loading Maps from External Files

For large maps (hundreds of entries), store the mapping data in a separate file:

```nginx
# In nginx.conf or a conf.d include
map $uri $redirect_target {
    default     "";
    include     /etc/nginx/redirects.map;
}
```

Create the map file:

```bash
sudo nano /etc/nginx/redirects.map
```

```text
# Format: source    destination
/old-home           /;
/about-us           /about;
/products/widget-a  /products/widget-pro;
/products/widget-b  /products/widget-lite;
```

```bash
# Test the configuration
sudo nginx -t

# Reload
sudo systemctl reload nginx
```

This is very efficient - Nginx reads the file once at startup or reload and builds an internal hash table.

## Chaining Multiple Maps

Maps can reference variables set by other maps, creating a chain of transformations:

```nginx
http {
    # First map: extract the account type from a cookie
    map $cookie_plan $plan_tier {
        default     "free";
        "basic"     "basic";
        "pro"       "pro";
        "enterprise" "enterprise";
    }

    # Second map: set rate limits based on the plan tier
    map $plan_tier $rate_limit_zone {
        default      "free_zone";
        "basic"      "basic_zone";
        "pro"        "pro_zone";
        "enterprise" "enterprise_zone";
    }

    # Third map: set backend based on tier
    map $plan_tier $api_backend {
        default      "http://shared-backend:3000";
        "enterprise" "http://dedicated-backend:3000";
    }

    limit_req_zone $binary_remote_addr zone=free_zone:10m rate=10r/m;
    limit_req_zone $binary_remote_addr zone=basic_zone:10m rate=60r/m;
    limit_req_zone $binary_remote_addr zone=pro_zone:10m rate=300r/m;
    limit_req_zone $binary_remote_addr zone=enterprise_zone:10m rate=1000r/m;

    server {
        listen 80;
        server_name api.example.com;

        location / {
            limit_req zone=$rate_limit_zone burst=20 nodelay;
            proxy_pass $api_backend;
        }
    }
}
```

## Debugging Map Variables

To verify your map is working as expected, log the variable value:

```nginx
# Temporarily add the mapped variable to the log format
log_format debug_map '$remote_addr - $time_local "$request" '
                     '$status backend=$backend mobile=$is_mobile';

server {
    listen 80;
    access_log /var/log/nginx/debug.log debug_map;
}
```

```bash
# Watch the log to see variable values for incoming requests
sudo tail -f /var/log/nginx/debug.log

# Test specific requests
curl -H "User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)" http://localhost/

# Verify nginx configuration is valid
sudo nginx -t
```

The `map` directive handles routing and variable logic in a way that is both readable and performant. Complex chains of `if` statements can almost always be replaced with maps, and the resulting configuration is easier to maintain and less prone to the subtle bugs that nested `if` blocks introduce in Nginx.
