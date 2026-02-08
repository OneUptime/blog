# How to Use Go Docker SDK for Automation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, go, golang, SDK, automation, container management, DevOps

Description: Use the Go Docker SDK to build fast, compiled automation tools for container management, image operations, and Docker orchestration.

---

Go is the language Docker itself is written in, which makes the Go Docker SDK the most natural choice for building Docker automation tools. The SDK provides direct access to the Docker Engine API with strong typing, excellent concurrency support, and the ability to compile your tools into single static binaries. No runtime dependencies, no interpreters needed on the target system.

This guide walks through using the Go Docker SDK for practical automation tasks.

## Setting Up Your Project

Initialize a Go module and install the Docker SDK:

```bash
# Create a new Go project for Docker automation
mkdir docker-automation && cd docker-automation
go mod init docker-automation

# Install the Docker SDK packages
go get github.com/docker/docker/client
go get github.com/docker/docker/api/types
go get github.com/docker/docker/api/types/container
go get github.com/docker/docker/api/types/filters
```

## Connecting to the Docker Daemon

```go
// main.go
// Establishes a connection to the Docker daemon and prints system info

package main

import (
	"context"
	"fmt"
	"log"

	"github.com/docker/docker/client"
)

func main() {
	ctx := context.Background()

	// Create a Docker client using environment variables (same as docker CLI)
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		log.Fatalf("Failed to create Docker client: %v", err)
	}
	defer cli.Close()

	// Get Docker system information
	info, err := cli.Info(ctx)
	if err != nil {
		log.Fatalf("Failed to get Docker info: %v", err)
	}

	fmt.Printf("Docker version: %s\n", info.ServerVersion)
	fmt.Printf("Containers running: %d\n", info.ContainersRunning)
	fmt.Printf("Images: %d\n", info.Images)
	fmt.Printf("Storage driver: %s\n", info.Driver)
}
```

```bash
# Build and run
go run main.go
```

## Listing Containers

```go
// list_containers.go
// Lists all containers with their status, image, and resource info

package main

import (
	"context"
	"fmt"
	"log"

	"github.com/docker/docker/api/types"
	containertypes "github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
)

func listContainers() {
	ctx := context.Background()
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		log.Fatal(err)
	}
	defer cli.Close()

	// List all containers including stopped ones
	containers, err := cli.ContainerList(ctx, containertypes.ListOptions{All: true})
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("%-20s %-30s %-15s %-12s\n", "NAME", "IMAGE", "STATUS", "ID")
	fmt.Println("------------------------------------------------------------------------------------")

	for _, c := range containers {
		name := ""
		if len(c.Names) > 0 {
			name = c.Names[0][1:] // Remove leading slash
		}
		fmt.Printf("%-20s %-30s %-15s %-12s\n",
			name, c.Image, c.State, c.ID[:12])
	}
}
```

## Creating and Managing Containers

```go
// container_lifecycle.go
// Demonstrates creating, starting, inspecting, and removing a container

package main

import (
	"context"
	"fmt"
	"io"
	"log"
	"os"
	"time"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/image"
	"github.com/docker/docker/api/types/network"
	"github.com/docker/docker/client"
	"github.com/docker/go-connections/nat"
)

func createAndRunContainer() {
	ctx := context.Background()
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		log.Fatal(err)
	}
	defer cli.Close()

	imageName := "nginx:alpine"

	// Pull the image first
	fmt.Printf("Pulling image %s...\n", imageName)
	reader, err := cli.ImagePull(ctx, imageName, image.PullOptions{})
	if err != nil {
		log.Fatal(err)
	}
	// Consume the pull output
	io.Copy(os.Stdout, reader)
	reader.Close()

	// Define the container configuration
	containerConfig := &container.Config{
		Image: imageName,
		Env:   []string{"NGINX_HOST=localhost"},
		Labels: map[string]string{
			"app":  "web",
			"team": "platform",
		},
		ExposedPorts: nat.PortSet{
			"80/tcp": struct{}{},
		},
	}

	// Define host configuration (port bindings, resource limits)
	hostConfig := &container.HostConfig{
		PortBindings: nat.PortMap{
			"80/tcp": []nat.PortBinding{
				{HostIP: "0.0.0.0", HostPort: "8080"},
			},
		},
		Resources: container.Resources{
			Memory:   256 * 1024 * 1024, // 256 MB memory limit
			NanoCPUs: 500000000,         // 0.5 CPU cores
		},
		RestartPolicy: container.RestartPolicy{
			Name:              "on-failure",
			MaximumRetryCount: 3,
		},
	}

	// Create the container
	resp, err := cli.ContainerCreate(ctx, containerConfig, hostConfig,
		&network.NetworkingConfig{}, nil, "web_server")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Created container: %s\n", resp.ID[:12])

	// Start the container
	err = cli.ContainerStart(ctx, resp.ID, container.StartOptions{})
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("Container started")

	// Wait a moment and check the status
	time.Sleep(2 * time.Second)

	// Inspect the running container
	inspect, err := cli.ContainerInspect(ctx, resp.ID)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Status: %s\n", inspect.State.Status)
	fmt.Printf("IP Address: %s\n", inspect.NetworkSettings.IPAddress)
	fmt.Printf("Started at: %s\n", inspect.State.StartedAt)

	// Get container logs
	logReader, err := cli.ContainerLogs(ctx, resp.ID, container.LogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Tail:       "10",
	})
	if err != nil {
		log.Fatal(err)
	}
	defer logReader.Close()
	fmt.Println("\nRecent logs:")
	io.Copy(os.Stdout, logReader)

	// Stop and remove the container
	timeout := 10
	stopOptions := container.StopOptions{Timeout: &timeout}
	cli.ContainerStop(ctx, resp.ID, stopOptions)
	cli.ContainerRemove(ctx, resp.ID, container.RemoveOptions{})
	fmt.Println("\nContainer stopped and removed")
}
```

## Monitoring Container Stats

```go
// monitor_stats.go
// Streams real-time resource usage stats for all running containers

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/docker/docker/api/types"
	containertypes "github.com/docker/docker/api/types/container"
	"github.com/docker/docker/client"
)

func monitorStats() {
	ctx := context.Background()
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		log.Fatal(err)
	}
	defer cli.Close()

	for {
		containers, err := cli.ContainerList(ctx, containertypes.ListOptions{})
		if err != nil {
			log.Printf("Error listing containers: %v", err)
			time.Sleep(10 * time.Second)
			continue
		}

		fmt.Printf("\n--- %s ---\n", time.Now().Format("2006-01-02 15:04:05"))
		fmt.Printf("%-25s %8s %8s %12s\n", "CONTAINER", "CPU%", "MEM%", "MEM USAGE")

		for _, c := range containers {
			// Get a single stats snapshot (stream=false)
			statsResp, err := cli.ContainerStatsOneShot(ctx, c.ID)
			if err != nil {
				continue
			}

			var stats types.StatsJSON
			json.NewDecoder(statsResp.Body).Decode(&stats)
			statsResp.Body.Close()

			// Calculate CPU percentage
			cpuDelta := float64(stats.CPUStats.CPUUsage.TotalUsage - stats.PreCPUStats.CPUUsage.TotalUsage)
			systemDelta := float64(stats.CPUStats.SystemUsage - stats.PreCPUStats.SystemUsage)
			cpuPercent := 0.0
			if systemDelta > 0 {
				cpuPercent = (cpuDelta / systemDelta) * 100.0
			}

			// Calculate memory percentage
			memUsage := stats.MemoryStats.Usage
			memLimit := stats.MemoryStats.Limit
			memPercent := 0.0
			if memLimit > 0 {
				memPercent = float64(memUsage) / float64(memLimit) * 100.0
			}

			name := c.Names[0][1:]
			fmt.Printf("%-25s %7.1f%% %7.1f%% %8.1f MB\n",
				name, cpuPercent, memPercent,
				float64(memUsage)/1024/1024)
		}

		time.Sleep(10 * time.Second)
	}
}
```

## Image Management

```go
// image_management.go
// Demonstrates image operations: list, pull, tag, and remove

package main

import (
	"context"
	"fmt"
	"io"
	"log"
	"os"

	"github.com/docker/docker/api/types/image"
	"github.com/docker/docker/client"
)

func manageImages() {
	ctx := context.Background()
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		log.Fatal(err)
	}
	defer cli.Close()

	// List all images
	images, err := cli.ImageList(ctx, image.ListOptions{})
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println("Local images:")
	for _, img := range images {
		tags := "untagged"
		if len(img.RepoTags) > 0 {
			tags = img.RepoTags[0]
		}
		sizeMB := float64(img.Size) / 1024 / 1024
		fmt.Printf("  %-40s %.1f MB\n", tags, sizeMB)
	}

	// Pull a new image
	fmt.Println("\nPulling alpine:latest...")
	reader, err := cli.ImagePull(ctx, "alpine:latest", image.PullOptions{})
	if err != nil {
		log.Fatal(err)
	}
	io.Copy(os.Stdout, reader)
	reader.Close()

	// Tag the image for a private registry
	err = cli.ImageTag(ctx, "alpine:latest", "registry.example.com/base/alpine:latest")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println("Image tagged for private registry")

	// Remove dangling images to free space
	pruneReport, err := cli.ImagesPrune(ctx, nil)
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("Pruned %d images, reclaimed %d bytes\n",
		len(pruneReport.ImagesDeleted),
		pruneReport.SpaceReclaimed)
}
```

## Event Listener with Concurrent Processing

Go's goroutines make it natural to process Docker events concurrently.

```go
// event_listener.go
// Listens for Docker events and processes them concurrently

package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/docker/docker/api/types/events"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/client"
)

func listenEvents() {
	ctx := context.Background()
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		log.Fatal(err)
	}
	defer cli.Close()

	// Filter for container events only
	filterArgs := filters.NewArgs()
	filterArgs.Add("type", "container")

	eventChan, errChan := cli.Events(ctx, events.ListOptions{
		Filters: filterArgs,
	})

	fmt.Println("Listening for Docker container events...")

	for {
		select {
		case event := <-eventChan:
			// Process each event in a goroutine for non-blocking handling
			go handleEvent(event)

		case err := <-errChan:
			log.Printf("Event stream error: %v", err)
			// Reconnect after a brief pause
			time.Sleep(5 * time.Second)
			eventChan, errChan = cli.Events(ctx, events.ListOptions{
				Filters: filterArgs,
			})
		}
	}
}

func handleEvent(event events.Message) {
	name := event.Actor.Attributes["name"]
	img := event.Actor.Attributes["image"]
	ts := time.Unix(event.Time, 0).Format("15:04:05")

	switch event.Action {
	case "start":
		fmt.Printf("[%s] STARTED: %s (%s)\n", ts, name, img)
	case "die":
		exitCode := event.Actor.Attributes["exitCode"]
		fmt.Printf("[%s] DIED: %s (%s) exit_code=%s\n", ts, name, img, exitCode)
	case "oom":
		fmt.Printf("[%s] OOM KILLED: %s (%s)\n", ts, name, img)
	default:
		fmt.Printf("[%s] %s: %s (%s)\n", ts, event.Action, name, img)
	}
}
```

## Building a CLI Tool

Compile your automation into a single binary:

```bash
# Build a statically linked binary (no external dependencies needed)
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o docker-tool main.go

# The resulting binary can be copied to any Linux machine and run directly
./docker-tool
```

## Summary

The Go Docker SDK gives you compiled, fast, and portable Docker automation tools. Its strong typing catches errors at compile time rather than runtime. Goroutines handle concurrent operations naturally, making it ideal for monitoring and event processing. The ability to compile to a single static binary means you can distribute your tools without worrying about runtime dependencies. Start with simple container management scripts and expand to monitoring, cleanup, and deployment tools as your needs grow.
