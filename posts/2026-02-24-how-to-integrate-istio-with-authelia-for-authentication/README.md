# How to Integrate Istio with Authelia for Authentication

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Authelia, Authentication, Security, SSO

Description: Learn how to set up Authelia as an authentication portal with Istio service mesh using external authorization for single sign-on and multi-factor auth.

---

Authelia is an open-source authentication and authorization server that provides single sign-on, two-factor authentication, and access control. If you want to add a login portal in front of your services without modifying their code, combining Authelia with Istio is a solid approach.

The integration uses Istio's external authorization feature to route unauthenticated requests to Authelia's login portal. Once a user authenticates, Authelia sets a session cookie and forwards authenticated headers to your backend services.

## Prerequisites

You need a running Kubernetes cluster with Istio installed and an ingress gateway configured. You also need a working DNS setup so Authelia can serve its login portal on a domain name.

## Deploying Authelia

Start by creating the Authelia configuration. Authelia needs a config file, and it supports various backends for user storage and session management.

Create the configuration ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: authelia-config
  namespace: authelia
data:
  configuration.yml: |
    theme: light
    server:
      host: 0.0.0.0
      port: 9091

    log:
      level: info

    totp:
      issuer: mycompany.com

    authentication_backend:
      file:
        path: /config/users.yml

    access_control:
      default_policy: deny
      rules:
        - domain: "*.mycompany.com"
          policy: one_factor
        - domain: "admin.mycompany.com"
          policy: two_factor

    session:
      name: authelia_session
      domain: mycompany.com
      expiration: 3600
      inactivity: 300
      remember_me_duration: 1M

    regulation:
      max_retries: 3
      find_time: 120
      ban_time: 300

    storage:
      local:
        path: /data/db.sqlite3

    notifier:
      filesystem:
        filename: /data/notification.txt
```

Create a users file:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: authelia-users
  namespace: authelia
data:
  users.yml: |
    users:
      admin:
        displayname: "Admin User"
        password: "$argon2id$v=19$m=65536,t=3,p=4$hash_here"
        email: admin@mycompany.com
        groups:
          - admins
          - dev
      developer:
        displayname: "Developer"
        password: "$argon2id$v=19$m=65536,t=3,p=4$hash_here"
        email: dev@mycompany.com
        groups:
          - dev
```

Generate password hashes using the Authelia CLI:

```bash
docker run --rm authelia/authelia:latest authelia crypto hash generate argon2 --password 'yourpassword'
```

Now deploy Authelia:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: authelia
  namespace: authelia
spec:
  replicas: 1
  selector:
    matchLabels:
      app: authelia
  template:
    metadata:
      labels:
        app: authelia
    spec:
      containers:
        - name: authelia
          image: authelia/authelia:latest
          ports:
            - containerPort: 9091
          volumeMounts:
            - name: config
              mountPath: /config/configuration.yml
              subPath: configuration.yml
            - name: users
              mountPath: /config/users.yml
              subPath: users.yml
            - name: data
              mountPath: /data
      volumes:
        - name: config
          configMap:
            name: authelia-config
        - name: users
          configMap:
            name: authelia-users
        - name: data
          emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: authelia
  namespace: authelia
spec:
  selector:
    app: authelia
  ports:
    - port: 9091
      targetPort: 9091
```

## Configuring Istio External Authorization

Register Authelia as an external authorization provider in your Istio mesh config. Authelia supports the Envoy ext_authz protocol through its verify endpoint:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
      - name: authelia
        envoyExtAuthzHttp:
          service: authelia.authelia.svc.cluster.local
          port: "9091"
          pathPrefix: "/api/verify"
          headersToUpstreamOnAllow:
            - remote-user
            - remote-groups
            - remote-name
            - remote-email
          headersToDownstreamOnDeny:
            - set-cookie
          includeRequestHeadersInCheck:
            - cookie
            - authorization
```

The key headers here are:

- `headersToUpstreamOnAllow`: When Authelia approves the request, it adds these headers with user information. Your backend services can read them to know who the user is.
- `headersToDownstreamOnDeny`: When denied, Authelia sends back cookies for session management.
- `includeRequestHeadersInCheck`: Forward the cookie and authorization headers to Authelia so it can check existing sessions.

## Creating Authorization Policies

Apply an Istio AuthorizationPolicy to enforce authentication on your services:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: authelia-auth
  namespace: default
spec:
  action: CUSTOM
  provider:
    name: authelia
  rules:
    - to:
        - operation:
            paths: ["/*"]
```

This enforces Authelia authentication on all services in the default namespace. Any request without a valid Authelia session will be redirected to the login portal.

To exclude certain paths (like health checks or public APIs):

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: authelia-auth
  namespace: default
spec:
  action: CUSTOM
  provider:
    name: authelia
  rules:
    - to:
        - operation:
            notPaths: ["/healthz", "/readyz", "/public/*"]
```

## Setting Up the Istio Gateway and Virtual Services

Configure the Istio Gateway to handle traffic for both Authelia and your protected services:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: main-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: wildcard-tls
      hosts:
        - "*.mycompany.com"
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: authelia
  namespace: authelia
spec:
  hosts:
    - auth.mycompany.com
  gateways:
    - istio-system/main-gateway
  http:
    - route:
        - destination:
            host: authelia.authelia.svc.cluster.local
            port:
              number: 9091
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - app.mycompany.com
  gateways:
    - istio-system/main-gateway
  http:
    - route:
        - destination:
            host: my-app.default.svc.cluster.local
            port:
              number: 8080
```

## Reading User Information in Backend Services

After Authelia authenticates a user, it adds headers that your backend services can read:

- `Remote-User`: The username
- `Remote-Groups`: Comma-separated list of groups
- `Remote-Name`: Display name
- `Remote-Email`: Email address

Here is how you might read these in a Go service:

```go
func handler(w http.ResponseWriter, r *http.Request) {
    user := r.Header.Get("Remote-User")
    groups := r.Header.Get("Remote-Groups")
    email := r.Header.Get("Remote-Email")

    fmt.Fprintf(w, "Hello %s, your groups: %s, email: %s", user, groups, email)
}
```

## Testing the Setup

Verify the integration works:

```bash
# Should redirect to Authelia login (302)
curl -v https://app.mycompany.com/

# After logging in, the session cookie should grant access
curl -v -b "authelia_session=your_session_cookie" https://app.mycompany.com/
```

Check Authelia logs for authentication decisions:

```bash
kubectl logs -n authelia deploy/authelia -f
```

## Production Considerations

For production, replace the file-based user backend with LDAP:

```yaml
authentication_backend:
  ldap:
    url: ldap://openldap.default.svc.cluster.local
    base_dn: dc=mycompany,dc=com
    username_attribute: uid
    additional_users_dn: ou=users
    additional_groups_dn: ou=groups
    users_filter: "(&(|({username_attribute}={input})({mail_attribute}={input}))(objectClass=person))"
    groups_filter: "(&(member={dn})(objectClass=groupOfNames))"
    user: cn=admin,dc=mycompany,dc=com
    password: your-ldap-admin-password
```

Replace the local SQLite storage with PostgreSQL:

```yaml
storage:
  postgres:
    host: postgres.default.svc.cluster.local
    port: 5432
    database: authelia
    username: authelia
    password: your-db-password
```

And use Redis for session storage to support multiple Authelia replicas:

```yaml
session:
  redis:
    host: redis.default.svc.cluster.local
    port: 6379
```

The combination of Istio and Authelia gives you a full-featured authentication layer with SSO, MFA, and group-based access control, all without changing a single line of application code. Your services just read headers and get on with their actual work.
