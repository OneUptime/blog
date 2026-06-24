# How to Handle IPv6 Addresses in Go Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, IPv6, Template, HTML, Text/template, Html/template

Description: Handle IPv6 addresses in Go templates including proper formatting, URL generation, and custom template functions.

## The IPv6 URL Formatting Challenge

IPv6 addresses in URLs require square brackets. This is a common source of bugs when generating URLs in templates. Go templates need custom functions to handle this correctly.

## Custom Template Functions for IPv6

```go
package main

import (
    "fmt"
    "net/netip"
    "text/template"
)

// IPv6 template helper functions
var templateFuncs = template.FuncMap{
    // Format IPv6 address for use in URLs (adds brackets)
    "ipv6URL": func(addr string) string {
        a, err := netip.ParseAddr(addr)
        if err != nil {
            return addr
        }
        a = a.Unmap()
        if a.Is6() {
            return "[" + a.String() + "]"
        }
        return a.String()
    },

    // Format IPv6 address with port for URLs
    "ipv6Host": func(addr string, port int) string {
        a, err := netip.ParseAddr(addr)
        if err != nil {
            return addr
        }
        a = a.Unmap()
        if a.Is6() {
            return fmt.Sprintf("[%s]:%d", a, port)
        }
        return fmt.Sprintf("%s:%d", a, port)
    },

    // Shorten IPv6 address for display (compressed form)
    "ipv6Short": func(addr string) string {
        a, err := netip.ParseAddr(addr)
        if err != nil {
            return addr
        }
        return a.Unmap().String()  // String() compresses IPv6 and keeps IPv4 dotted-decimal
    },

    // Check if address is IPv6
    "isIPv6": func(addr string) bool {
        a, err := netip.ParseAddr(addr)
        if err != nil {
            return false
        }
        return a.Unmap().Is6()
    },
}
```

## Using Template Functions in HTML Templates

```go
package main

import (
    "html/template"
    "os"
)

const serverListTemplate = `
<!DOCTYPE html>
<html>
<head><title>Server List</title></head>
<body>
  <h1>Servers</h1>
  <table>
    <tr><th>Name</th><th>Address</th><th>Management URL</th></tr>
    {{range .Servers}}
    <tr>
      <td>{{.Name}}</td>
      <td>
        {{if isIPv6 .IPAddress}}
          <code>[{{ipv6Short .IPAddress}}]</code> (IPv6)
        {{else}}
          <code>{{.IPAddress}}</code> (IPv4)
        {{end}}
      </td>
      <td>
        <a href="https://{{ipv6Host .IPAddress 8443}}/admin">
          Admin Panel
        </a>
      </td>
    </tr>
    {{end}}
  </table>
</body>
</html>
`

type Server struct {
    Name      string
    IPAddress string
}

func main() {
    tmpl := template.Must(
        template.New("servers").
            Funcs(templateFuncs).
            Parse(serverListTemplate),
    )

    data := struct {
        Servers []Server
    }{
        Servers: []Server{
            {Name: "web-1", IPAddress: "2001:db8::10"},
            {Name: "web-2", IPAddress: "192.168.1.20"},
            {Name: "db-1",  IPAddress: "2001:db8::30"},
        },
    }

    tmpl.Execute(os.Stdout, data)
}
```

## Generating IPv6 Configuration Files from Templates

```go
package main

import (
    "bytes"
    "net/netip"
    "text/template"
)

const nginxIPv6Template = `
# Auto-generated nginx configuration for IPv6 servers

# Generated: {{.Timestamp}}

{{range .Upstreams}}
upstream {{.Name}} {
    {{range .Servers}}
    server [{{ipv6Short .Address}}]:{{.Port}};
    {{end}}
}
{{end}}

server {
    listen [::]:80;
    listen [::]:443 ssl;
    server_name {{.ServerName}};

    {{range .Locations}}
    location {{.Path}} {
        proxy_pass http://{{.Upstream}};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    {{end}}
}
`

type UpstreamServer struct {
    Address string
    Port    int
}

type Upstream struct {
    Name    string
    Servers []UpstreamServer
}

type Location struct {
    Path     string
    Upstream string
}

type NginxConfig struct {
    Timestamp  string
    ServerName string
    Upstreams  []Upstream
    Locations  []Location
}

func generateNginxConfig(config NginxConfig) (string, error) {
    funcs := template.FuncMap{
        "ipv6Short": func(addr string) string {
            a, err := netip.ParseAddr(addr)
            if err != nil {
                return addr
            }
            return a.Unmap().String()
        },
    }

    tmpl, err := template.New("nginx").Funcs(funcs).Parse(nginxIPv6Template)
    if err != nil {
        return "", err
    }

    var buf bytes.Buffer
    if err := tmpl.Execute(&buf, config); err != nil {
        return "", err
    }
    return buf.String(), nil
}
```

## Network Device Configuration Template

```go
const routerConfigTemplate = `
! Router configuration for {{.Hostname}}
! Generated automatically

{{range .IPv6Interfaces}}
interface {{.Name}}
  ipv6 address {{.Address}}/{{.PrefixLen}}
  ipv6 nd ra-interval 30
  no shutdown
!
{{end}}

router bgp {{.ASN}}
 bgp router-id {{.RouterID}}
 {{range .Neighbors}}
 neighbor {{ipv6Short .Address}} remote-as {{.RemoteAS}}
 neighbor {{ipv6Short .Address}} description {{.Description}}
 {{end}}
 address-family ipv6
  {{range .Neighbors}}
  neighbor {{ipv6Short .Address}} activate
  {{end}}
  {{range .Networks}}
  network {{.Prefix}}/{{.Length}}
  {{end}}
`
```

## Conclusion

Go templates handle IPv6 well when custom template functions are added for URL formatting and address normalization. The key requirement is wrapping IPv6 addresses in square brackets when generating URLs (`[2001:db8::1]:port`). Custom functions via `template.FuncMap` provide reusable, testable IPv6 formatting logic for both HTML and text template rendering.
