# Validation Summary: How to Configure Readiness Probes That Check Downstream Service Dependencies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes readiness and liveness probes
- Go HTTP handlers and HTTP clients
- Python Flask
- psycopg2
- redis-py
- Python Requests
- Circuit breaker pattern

## Sources Consulted
- Kubernetes documentation: Liveness, Readiness, and Startup Probes - https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes documentation: Configure Liveness, Readiness and Startup Probes - https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Go net/http package documentation - https://pkg.go.dev/net/http
- Psycopg 2.9 connection documentation - https://www.psycopg.org/docs/connection.html
- Psycopg 2.9 basic usage documentation - https://www.psycopg.org/docs/usage
- redis-py connection documentation - https://redis.readthedocs.io/en/latest/connections.html
- Requests quickstart documentation: Timeouts - https://requests.readthedocs.io/en/latest/user/quickstart/#timeouts
- Flask quickstart documentation: About Responses and APIs with JSON - https://flask-docs.readthedocs.io/en/latest/quickstart/

## Issues Found
- The Go partial dependency failure example used `for name, status := range deps` but never used `name`, which would not compile in Go. Changed `name` to `_`.
- The Go circuit breaker example used `http.Get` without a timeout and did not close `resp.Body`. Added a reusable `http.Client` with a timeout and `defer resp.Body.Close()` after a successful response.
- The Python payment service check returned `(False, None)` for non-200 status codes, producing an unhelpful failed check such as `payment_service: None`. Updated it to return the status code as the error detail, matching the user service example.

## Review Notes
- Kubernetes documentation explicitly supports readiness probes that check required back-end services when the application has a strict dependency on them. The post's guidance to avoid optional and deep dependency checks is consistent with that caveat.
- The snippets are illustrative and omit imports, global clients, and production concerns such as connection pooling and authentication. The technical APIs and Kubernetes fields shown are current and valid.
