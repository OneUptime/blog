# How to Use Rancher API with Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, API, REST API, Go, Automation

Description: Learn how to interact with the Rancher API using Go, including building a client, managing clusters, handling pagination, and creating automation tools.

Go is a natural choice for Rancher API integrations since Rancher itself is written in Go. This guide uses Rancher's previous v3 API (`/v3/...`) to build a Go client, perform common operations, and create automation tools. Rancher introduced the newer RK-API in v2.8, and starting with Rancher v2.14 legacy v3 API tokens are being phased out, so the examples below assume you are working specifically with the v3 API and a Rancher API key's Bearer Token.

## Setting Up the Project

Initialize a Go module:

```bash
mkdir rancher-client && cd rancher-client
go mod init rancher-client
```

## Basic API Client

Start with a simple HTTP client that handles Bearer token authentication and optional TLS verification skipping:

```go
package main

import (
    "crypto/tls"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "net/url"
    "os"
    "strings"
    "time"
)

type RancherClient struct {
    BaseURL    string
    Token      string
    HTTPClient *http.Client
}

func NewRancherClient(baseURL, token string, skipTLS bool) *RancherClient {
    transport := &http.Transport{}
    if skipTLS {
        transport.TLSClientConfig = &tls.Config{InsecureSkipVerify: true}
    }

    return &RancherClient{
        BaseURL: strings.TrimRight(baseURL, "/"),
        Token:   token,
        HTTPClient: &http.Client{
            Transport: transport,
            Timeout:   30 * time.Second,
        },
    }
}

func (c *RancherClient) doRequest(method, endpoint string, body io.Reader) ([]byte, error) {
    url := c.BaseURL + endpoint
    req, err := http.NewRequest(method, url, body)
    if err != nil {
        return nil, fmt.Errorf("creating request: %w", err)
    }

    req.Header.Set("Authorization", "Bearer "+c.Token)
    req.Header.Set("Content-Type", "application/json")

    resp, err := c.HTTPClient.Do(req)
    if err != nil {
        return nil, fmt.Errorf("executing request: %w", err)
    }
    defer resp.Body.Close()

    data, err := io.ReadAll(resp.Body)
    if err != nil {
        return nil, fmt.Errorf("reading response: %w", err)
    }

    if resp.StatusCode >= 400 {
        return nil, fmt.Errorf("API error %d: %s", resp.StatusCode, string(data))
    }

    return data, nil
}

func (c *RancherClient) Get(endpoint string) ([]byte, error) {
    return c.doRequest("GET", endpoint, nil)
}

func (c *RancherClient) Post(endpoint string, body string) ([]byte, error) {
    return c.doRequest("POST", endpoint, strings.NewReader(body))
}

func (c *RancherClient) Put(endpoint string, body string) ([]byte, error) {
    return c.doRequest("PUT", endpoint, strings.NewReader(body))
}

func (c *RancherClient) Delete(endpoint string) ([]byte, error) {
    return c.doRequest("DELETE", endpoint, nil)
}
```

## Data Structures

Define Go structs for Rancher resources:

```go
type Collection struct {
    Data       json.RawMessage `json:"data"`
    Pagination Pagination      `json:"pagination"`
}

type Pagination struct {
    Limit int    `json:"limit"`
    Total int    `json:"total"`
    Next  string `json:"next"`
}

type Cluster struct {
    ID         string          `json:"id"`
    Name       string          `json:"name"`
    State      string          `json:"state"`
    Provider   string          `json:"provider"`
    NodeCount  int             `json:"nodeCount"`
    Version    ClusterVersion  `json:"version"`
    Conditions []Condition     `json:"conditions"`
    Created    string          `json:"created"`
}

type ClusterVersion struct {
    GitVersion string `json:"gitVersion"`
}

type Condition struct {
    Type    string `json:"type"`
    Status  string `json:"status"`
    Message string `json:"message"`
}

type Node struct {
    ID           string            `json:"id"`
    NodeName     string            `json:"nodeName"`
    State        string            `json:"state"`
    IPAddress    string            `json:"ipAddress"`
    ClusterID    string            `json:"clusterId"`
    ControlPlane bool             `json:"controlPlane"`
    Etcd         bool             `json:"etcd"`
    Worker       bool             `json:"worker"`
    Allocatable  map[string]string `json:"allocatable"`
}

type User struct {
    ID       string `json:"id"`
    Username string `json:"username"`
    Name     string `json:"name"`
    Enabled  bool   `json:"enabled"`
}

type KubeconfigResponse struct {
    Config string `json:"config"`
}
```

## Cluster Operations

### Listing Clusters

```go
func (c *RancherClient) ListClusters() ([]Cluster, error) {
    data, err := c.Get("/v3/clusters")
    if err != nil {
        return nil, err
    }

    var collection struct {
        Data []Cluster `json:"data"`
    }
    if err := json.Unmarshal(data, &collection); err != nil {
        return nil, fmt.Errorf("parsing clusters: %w", err)
    }

    return collection.Data, nil
}

func (c *RancherClient) GetCluster(id string) (*Cluster, error) {
    data, err := c.Get("/v3/clusters/" + url.PathEscape(id))
    if err != nil {
        return nil, err
    }

    var cluster Cluster
    if err := json.Unmarshal(data, &cluster); err != nil {
        return nil, fmt.Errorf("parsing cluster: %w", err)
    }

    return &cluster, nil
}
```

### Getting Cluster Nodes

```go
func (c *RancherClient) GetClusterNodes(clusterID string) ([]Node, error) {
    data, err := c.Get("/v3/nodes?clusterId=" + url.QueryEscape(clusterID))
    if err != nil {
        return nil, err
    }

    var collection struct {
        Data []Node `json:"data"`
    }
    if err := json.Unmarshal(data, &collection); err != nil {
        return nil, fmt.Errorf("parsing nodes: %w", err)
    }

    return collection.Data, nil
}
```

### Generating Kubeconfig

```go
func (c *RancherClient) GenerateKubeconfig(clusterID string) (string, error) {
    data, err := c.Post(
        "/v3/clusters/"+url.PathEscape(clusterID)+"?action=generateKubeconfig",
        "{}",
    )
    if err != nil {
        return "", err
    }

    var resp KubeconfigResponse
    if err := json.Unmarshal(data, &resp); err != nil {
        return "", fmt.Errorf("parsing kubeconfig: %w", err)
    }

    return resp.Config, nil
}
```

## User Management

```go
func (c *RancherClient) CreateUser(username, name, password string) (*User, error) {
    body := fmt.Sprintf(`{
        "username": %q,
        "name": %q,
        "password": %q,
        "mustChangePassword": true,
        "enabled": true
    }`, username, name, password)

    data, err := c.Post("/v3/users", body)
    if err != nil {
        return nil, err
    }

    var user User
    if err := json.Unmarshal(data, &user); err != nil {
        return nil, fmt.Errorf("parsing user: %w", err)
    }

    return &user, nil
}

func (c *RancherClient) ListUsers() ([]User, error) {
    data, err := c.Get("/v3/users")
    if err != nil {
        return nil, err
    }

    var collection struct {
        Data []User `json:"data"`
    }
    if err := json.Unmarshal(data, &collection); err != nil {
        return nil, fmt.Errorf("parsing users: %w", err)
    }

    return collection.Data, nil
}
```

## Pagination Helper

Handle paginated results automatically:

```go
func (c *RancherClient) ListAll(endpoint string) ([]json.RawMessage, error) {
    var allItems []json.RawMessage
    pageURL, err := url.Parse(c.BaseURL + endpoint)
    if err != nil {
        return nil, fmt.Errorf("parsing endpoint: %w", err)
    }

    query := pageURL.Query()
    if query.Get("limit") == "" {
        query.Set("limit", "1000")
    }
    pageURL.RawQuery = query.Encode()

    for pageURL != nil {
        currentURL := pageURL.String()

        req, err := http.NewRequest("GET", currentURL, nil)
        if err != nil {
            return nil, fmt.Errorf("creating request: %w", err)
        }
        req.Header.Set("Authorization", "Bearer "+c.Token)

        resp, err := c.HTTPClient.Do(req)
        if err != nil {
            return nil, fmt.Errorf("executing request: %w", err)
        }

        body, err := io.ReadAll(resp.Body)
        resp.Body.Close()
        if err != nil {
            return nil, fmt.Errorf("reading response: %w", err)
        }

        if resp.StatusCode >= 400 {
            return nil, fmt.Errorf("API error %d: %s", resp.StatusCode, string(body))
        }

        var page struct {
            Data       []json.RawMessage `json:"data"`
            Pagination struct {
                Next string `json:"next"`
            } `json:"pagination"`
        }

        if err := json.Unmarshal(body, &page); err != nil {
            return nil, fmt.Errorf("parsing page: %w", err)
        }

        allItems = append(allItems, page.Data...)
        if page.Pagination.Next == "" {
            pageURL = nil
            continue
        }

        nextURL, err := url.Parse(page.Pagination.Next)
        if err != nil {
            return nil, fmt.Errorf("parsing next page URL: %w", err)
        }
        pageURL = pageURL.ResolveReference(nextURL)
    }

    return allItems, nil
}
```

## Complete Example: Cluster Health Check

```go
func main() {
    rancherURL := os.Getenv("RANCHER_URL")
    rancherToken := os.Getenv("RANCHER_TOKEN")

    if rancherURL == "" || rancherToken == "" {
        fmt.Println("Set RANCHER_URL and RANCHER_TOKEN environment variables")
        os.Exit(1)
    }

    client := NewRancherClient(rancherURL, rancherToken, false)

    clusters, err := client.ListClusters()
    if err != nil {
        fmt.Printf("Error listing clusters: %v\n", err)
        os.Exit(1)
    }

    fmt.Println("=== Cluster Health Report ===")
    fmt.Println()

    for _, cluster := range clusters {
        fmt.Printf("Cluster: %s (%s)\n", cluster.Name, cluster.ID)
        fmt.Printf("  State: %s\n", cluster.State)
        fmt.Printf("  Kubernetes: %s\n", cluster.Version.GitVersion)

        nodes, err := client.GetClusterNodes(cluster.ID)
        if err != nil {
            fmt.Printf("  Error getting nodes: %v\n", err)
            continue
        }

        healthyNodes := 0
        for _, node := range nodes {
            if node.State == "active" {
                healthyNodes++
            }
        }
        fmt.Printf("  Nodes: %d/%d healthy\n", healthyNodes, len(nodes))

        failingConditions := 0
        for _, cond := range cluster.Conditions {
            if cond.Status != "True" {
                failingConditions++
                fmt.Printf("  WARNING: %s - %s\n", cond.Type, cond.Message)
            }
        }

        if cluster.State == "active" && failingConditions == 0 {
            fmt.Println("  Status: HEALTHY")
        } else {
            fmt.Println("  Status: NEEDS ATTENTION")
        }
        fmt.Println()
    }
}
```

Build and run:

```bash
export RANCHER_URL="https://rancher.example.com"
export RANCHER_TOKEN="<rancher-bearer-token>"

go build -o rancher-health .
./rancher-health
```

## Error Handling with Custom Types

```go
type APIError struct {
    StatusCode int
    Message    string
    Type       string
}

func (e *APIError) Error() string {
    return fmt.Sprintf("Rancher API error %d: %s", e.StatusCode, e.Message)
}

func (c *RancherClient) doRequestTyped(method, endpoint string, body io.Reader) ([]byte, error) {
    url := c.BaseURL + endpoint
    req, err := http.NewRequest(method, url, body)
    if err != nil {
        return nil, err
    }

    req.Header.Set("Authorization", "Bearer "+c.Token)
    req.Header.Set("Content-Type", "application/json")

    resp, err := c.HTTPClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    data, err := io.ReadAll(resp.Body)
    if err != nil {
        return nil, err
    }

    if resp.StatusCode >= 400 {
        var apiErr struct {
            Message string `json:"message"`
            Type    string `json:"type"`
        }
        json.Unmarshal(data, &apiErr)
        return nil, &APIError{
            StatusCode: resp.StatusCode,
            Message:    apiErr.Message,
            Type:       apiErr.Type,
        }
    }

    return data, nil
}
```

## Summary

Go provides a strongly typed and performant way to interact with Rancher's previous v3 API. Build a reusable client struct with methods for each resource type, define proper data structures for API responses, and implement pagination helpers for large datasets. Use custom error types for clean error handling, and compile your tools into standalone binaries for easy distribution across your team. For new automation on newer Rancher versions, prefer RK-API when possible.
