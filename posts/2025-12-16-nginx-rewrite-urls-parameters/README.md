# How to Rewrite Large Numbers of URLs with Parameters in Nginx

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Nginx, URL Rewriting, Regex, Migration, SEO

Description: Learn efficient techniques for rewriting large numbers of URLs with parameters in Nginx, including map directives, regex patterns, and performance optimization strategies.

---

URL rewriting becomes complex when you need to handle hundreds or thousands of URLs, each with different parameters. Whether you're migrating from an old CMS, restructuring your site, or implementing SEO redirects, Nginx provides powerful tools to handle mass rewrites efficiently.

## Understanding the Challenge

When dealing with large-scale URL rewrites, you face several challenges:

```mermaid
flowchart TD
    A[Incoming URL] --> B{Rewrite Type}
    B -->|Simple 1:1| C[Map Directive]
    B -->|Pattern Based| D[Regex Rewrite]
    B -->|With Parameters| E[Capture Groups]
    B -->|Conditional| F[If + Set]

    C --> G[O(1) Lookup]
    D --> H[Sequential Match]
    E --> I[Parameter Extraction]
    F --> J[Complex Logic]

    G --> K[Best Performance]
    H --> L[Moderate Performance]
    I --> M[Parameter Handling]
    J --> N[Avoid if Possible]
```

## Method 1: Map Directive for Static Redirects

The most efficient method for large numbers of static URL mappings:

```nginx
# /etc/nginx/conf.d/redirects-map.conf

# Simple path-to-path mapping
map $request_uri $new_uri {
    default "";

    # Old URL -> New URL
    /old-page.html              /new-page/;
    /products/item-123          /shop/product/123/;
    /blog/2020/post-title       /articles/post-title/;
    /category/old-name          /category/new-name/;
}

# In server block
server {
    listen 80;
    server_name example.com;

    if ($new_uri != "") {
        return 301 $new_uri;
    }

    # ... rest of config
}
```

## Method 2: Map with Query String Parameters

Handle URLs with query parameters:

```nginx
# Map using the full URI including query string
map $request_uri $redirect_uri {
    default "";

    # Exact match with query string
    "/search?q=old-term"        "/search?q=new-term";
    "/page.php?id=1"            "/pages/first/";
    "/page.php?id=2"            "/pages/second/";
    "/page.php?id=3"            "/pages/third/";
}

# Or map just the query string
map $arg_id $product_redirect {
    default "";
    1       /products/widget/;
    2       /products/gadget/;
    3       /products/thing/;
}

server {
    listen 80;
    server_name example.com;

    # Handle full URI redirects
    if ($redirect_uri != "") {
        return 301 $redirect_uri;
    }

    # Handle product redirects
    location = /product.php {
        if ($product_redirect != "") {
            return 301 $product_redirect;
        }
        # Fallback handling
        return 404;
    }
}
```

## Method 3: Regex Patterns for URL Transformations

Use regex when URLs follow patterns:

```nginx
server {
    listen 80;
    server_name example.com;

    # Transform /blog/YYYY/MM/DD/title to /posts/title
    rewrite ^/blog/\d{4}/\d{2}/\d{2}/(.+)$ /posts/$1 permanent;

    # Transform /product.php?id=123 to /products/123/
    if ($arg_id ~ "^(\d+)$") {
        set $product_id $1;
    }
    location = /product.php {
        return 301 /products/$product_id/;
    }

    # Transform /category/ID/name to /c/name
    rewrite ^/category/\d+/(.+)$ /c/$1 permanent;

    # Handle multiple parameters
    # /search.php?category=X&sort=Y -> /search/X/?order=Y
    location = /search.php {
        set $new_path /search/$arg_category/;
        if ($arg_sort != "") {
            set $new_path "${new_path}?order=$arg_sort";
        }
        return 301 $new_path;
    }
}
```

## Method 4: Include External Map Files

For hundreds of redirects, use external files:

```nginx
# /etc/nginx/maps/product-redirects.map
# Format: old_url new_url;

/old-product-1      /new-products/widget-1/;
/old-product-2      /new-products/widget-2/;
/old-product-3      /new-products/gadget-1/;
# ... hundreds more lines
```

```nginx
# /etc/nginx/nginx.conf
http {
    # Include map from external file
    map $uri $product_new_uri {
        default "";
        include /etc/nginx/maps/product-redirects.map;
    }

    server {
        listen 80;
        server_name example.com;

        if ($product_new_uri != "") {
            return 301 $product_new_uri;
        }
    }
}
```

Generate map files from databases or spreadsheets:

```bash
#!/bin/bash
# generate-redirects.sh

# From CSV file
while IFS=, read -r old_url new_url; do
    echo "${old_url} ${new_url};"
done < redirects.csv > /etc/nginx/maps/redirects.map

# From database
mysql -N -e "SELECT old_url, new_url FROM redirects" mydb | \
    while read old new; do
        echo "${old} ${new};"
    done > /etc/nginx/maps/redirects.map

# Reload nginx
nginx -t && systemctl reload nginx
```

## Method 5: Complex Parameter Rewriting

Handle URLs with multiple parameters:

```nginx
# Map for category slug to ID
map $arg_cat $category_slug {
    default "";
    1       electronics;
    2       clothing;
    3       home-garden;
}

# Map for sort parameter
map $arg_sort $sort_param {
    default "";
    price_asc   ?sort=price&order=asc;
    price_desc  ?sort=price&order=desc;
    newest      ?sort=date&order=desc;
}

server {
    listen 80;
    server_name example.com;

    # /products.php?cat=1&sort=price_asc -> /category/electronics/?sort=price&order=asc
    location = /products.php {
        set $redirect_path "";

        if ($category_slug != "") {
            set $redirect_path /category/$category_slug/;
        }

        if ($redirect_path = "") {
            return 404;
        }

        if ($sort_param != "") {
            set $redirect_path "$redirect_path$sort_param";
        }

        return 301 $redirect_path;
    }
}
```

## Method 6: Lua for Complex Logic

When Nginx directives aren't enough, use Lua:

```nginx
# Requires ngx_http_lua_module
http {
    lua_shared_dict redirects 10m;

    init_by_lua_block {
        -- Load redirects from file or database
        local redirects = ngx.shared.redirects

        -- Example: load from file
        local file = io.open("/etc/nginx/redirects.txt", "r")
        if file then
            for line in file:lines() do
                local old, new = line:match("^(%S+)%s+(%S+)$")
                if old and new then
                    redirects:set(old, new)
                end
            end
            file:close()
        end
    }

    server {
        listen 80;
        server_name example.com;

        location / {
            access_by_lua_block {
                local redirects = ngx.shared.redirects
                local uri = ngx.var.request_uri

                -- Check for exact match
                local new_uri = redirects:get(uri)
                if new_uri then
                    return ngx.redirect(new_uri, 301)
                end

                -- Check for pattern matches
                -- /product/OLD-ID -> /items/NEW-ID
                local old_id = uri:match("^/product/(%d+)$")
                if old_id then
                    -- Transform ID (example: add 1000)
                    local new_id = tonumber(old_id) + 1000
                    return ngx.redirect("/items/" .. new_id .. "/", 301)
                end
            }

            # Normal request handling
            try_files $uri $uri/ =404;
        }
    }
}
```

## Performance Optimization

### Hash Size for Large Maps

```nginx
http {
    # Increase hash sizes for large maps
    map_hash_bucket_size 128;
    map_hash_max_size 4096;

    map $uri $redirect {
        # ... thousands of entries
    }
}
```

### Order Patterns by Frequency

```nginx
# Put most common redirects first in regex-based rewrites
server {
    # Most accessed old URLs first
    rewrite ^/popular-old-page$ /new-location/ permanent;
    rewrite ^/another-popular$ /different/ permanent;

    # Less common patterns later
    rewrite ^/archive/(\d+)/(.*)$ /old-archive/$1-$2/ permanent;
}
```

### Avoid Excessive If Statements

```nginx
# Bad: Multiple if statements
location / {
    if ($arg_page = "1") { return 301 /page-one/; }
    if ($arg_page = "2") { return 301 /page-two/; }
    if ($arg_page = "3") { return 301 /page-three/; }
    # ... many more
}

# Good: Use map
map $arg_page $page_redirect {
    default "";
    1       /page-one/;
    2       /page-two/;
    3       /page-three/;
}

location / {
    if ($page_redirect != "") {
        return 301 $page_redirect;
    }
}
```

## Testing URL Rewrites

### Local Testing

```bash
# Test specific redirects
curl -I "http://localhost/old-page.html"
# Should return: HTTP/1.1 301 Moved Permanently
# Location: /new-page/

# Test with parameters
curl -I "http://localhost/product.php?id=123"

# Bulk testing from file
while read url; do
    response=$(curl -sI "http://localhost${url}" | head -2)
    echo "$url -> $response"
done < test-urls.txt
```

### Redirect Validation Script

```bash
#!/bin/bash
# test-redirects.sh

DOMAIN="https://example.com"
ERRORS=0

# Read expected redirects
while IFS=',' read -r old_url expected_url; do
    actual=$(curl -sI "${DOMAIN}${old_url}" | grep -i "location:" | awk '{print $2}' | tr -d '\r')

    if [ "$actual" = "$expected_url" ] || [ "$actual" = "${DOMAIN}${expected_url}" ]; then
        echo "OK: $old_url -> $expected_url"
    else
        echo "FAIL: $old_url"
        echo "  Expected: $expected_url"
        echo "  Actual: $actual"
        ((ERRORS++))
    fi
done < redirect-tests.csv

echo ""
echo "Total errors: $ERRORS"
exit $ERRORS
```

## Handling Edge Cases

### Preserve vs Strip Query Strings

```nginx
# Strip query string (default with rewrite)
rewrite ^/old-page$ /new-page permanent;
# /old-page?foo=bar -> /new-page

# Preserve query string
rewrite ^/old-page$ /new-page? permanent;
# Note the ? at the end - it appends nothing, keeping original query
# Actually: rewrite ^/old-page$ /new-page permanent; preserves by default

# To truly strip query string
if ($request_uri ~ ^/old-page) {
    return 301 /new-page;
}

# Explicit append
rewrite ^/old-page$ /new-page?$query_string permanent;
```

### Case-Insensitive Matching

```nginx
# Map is case-sensitive by default
map $uri $redirect {
    /Page     /new-page/;  # Only matches /Page, not /page or /PAGE
}

# For case-insensitive, use regex in map
map $uri $redirect {
    ~*^/page$   /new-page/;  # Matches /page, /Page, /PAGE
}
```

### Trailing Slash Handling

```nginx
# Normalize trailing slashes before redirect lookup
map $uri $normalized_uri {
    ~^(.*)/$ $1;  # Remove trailing slash
    default  $uri;
}

map $normalized_uri $redirect {
    /old-page   /new-page/;
    /another    /different/;
}
```

## Summary

| Method | Use Case | Performance | Complexity |
|--------|----------|-------------|------------|
| Map (static) | 1:1 URL mapping | Excellent (O(1)) | Low |
| Map (regex) | Pattern matching | Good | Medium |
| External map file | Large redirect sets | Excellent | Low |
| Rewrite directive | Simple transformations | Good | Low |
| If + set | Multiple conditions | Moderate | Medium |
| Lua | Complex logic | Variable | High |

For large-scale URL rewriting, the map directive with external files provides the best balance of performance and maintainability. Reserve regex rewrites for pattern-based transformations and Lua for cases that truly require complex logic.
