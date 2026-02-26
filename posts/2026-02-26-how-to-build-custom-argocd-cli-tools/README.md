# How to Build Custom ArgoCD CLI Tools

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, CLI, Developer Tools

Description: Build custom command-line tools that extend ArgoCD's CLI using its REST API and Go client library for team-specific deployment workflows and automation.

---

The official ArgoCD CLI covers the core operations well, but every team has unique workflows that the built-in commands do not address. Maybe you need a tool that promotes an application across environments, a pre-flight check that validates manifests before syncing, or a bulk operations tool for managing hundreds of applications at once.

Building custom CLI tools on top of ArgoCD's API is straightforward. This post shows you how to build them in both Go (using ArgoCD's own client library) and Python (using the REST API directly).

## Approach 1: Go with the ArgoCD Client Library

ArgoCD is written in Go, and its client libraries are available as Go modules. This gives you type-safe access to every API endpoint.

### Setting Up the Go Project

```bash
# Initialize a new Go project
mkdir argocd-tools && cd argocd-tools
go mod init github.com/company/argocd-tools

# Add the ArgoCD client dependency
go get github.com/argoproj/argo-cd/v2@latest
```

### Building a Promotion Tool

This tool promotes an application from staging to production by copying the staging revision to the production application's target revision.

```go
// cmd/promote/main.go
// Promotes an application's revision from one environment to another
package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/argoproj/argo-cd/v2/pkg/apiclient"
	"github.com/argoproj/argo-cd/v2/pkg/apiclient/application"
	"github.com/spf13/cobra"
)

func main() {
	var (
		argocdServer string
		authToken    string
		sourceApp    string
		targetApp    string
		autoSync     bool
	)

	cmd := &cobra.Command{
		Use:   "promote",
		Short: "Promote an ArgoCD application revision between environments",
		RunE: func(cmd *cobra.Command, args []string) error {
			// Create the ArgoCD API client
			clientOpts := &apiclient.ClientOptions{
				ServerAddr: argocdServer,
				AuthToken:  authToken,
				Insecure:   true, // Adjust for your TLS setup
			}

			client, err := apiclient.NewClient(clientOpts)
			if err != nil {
				return fmt.Errorf("failed to create client: %w", err)
			}

			// Get the application service client
			_, appClient, err := client.NewApplicationClient()
			if err != nil {
				return fmt.Errorf("failed to create app client: %w", err)
			}

			ctx := context.Background()

			// Get the source application's current synced revision
			sourceAppData, err := appClient.Get(ctx, &application.ApplicationQuery{
				Name: &sourceApp,
			})
			if err != nil {
				return fmt.Errorf("failed to get source app: %w", err)
			}

			sourceRevision := sourceAppData.Status.Sync.Revision
			fmt.Printf("Source app %s is at revision: %s\n", sourceApp, sourceRevision[:7])

			// Get the target application
			targetAppData, err := appClient.Get(ctx, &application.ApplicationQuery{
				Name: &targetApp,
			})
			if err != nil {
				return fmt.Errorf("failed to get target app: %w", err)
			}

			currentTargetRev := targetAppData.Status.Sync.Revision
			fmt.Printf("Target app %s is at revision: %s\n", targetApp, currentTargetRev[:7])

			if sourceRevision == currentTargetRev {
				fmt.Println("Apps are already at the same revision. Nothing to do.")
				return nil
			}

			// Update the target application's target revision
			targetAppData.Spec.Source.TargetRevision = sourceRevision
			_, err = appClient.Update(ctx, &application.ApplicationUpdateRequest{
				Application: targetAppData,
			})
			if err != nil {
				return fmt.Errorf("failed to update target app: %w", err)
			}

			fmt.Printf("Updated %s target revision to %s\n", targetApp, sourceRevision[:7])

			// Optionally trigger a sync
			if autoSync {
				_, err = appClient.Sync(ctx, &application.ApplicationSyncRequest{
					Name:  &targetApp,
					Prune: true,
				})
				if err != nil {
					return fmt.Errorf("failed to sync target app: %w", err)
				}
				fmt.Printf("Sync triggered for %s\n", targetApp)
			}

			return nil
		},
	}

	cmd.Flags().StringVar(&argocdServer, "server", os.Getenv("ARGOCD_SERVER"), "ArgoCD server address")
	cmd.Flags().StringVar(&authToken, "token", os.Getenv("ARGOCD_AUTH_TOKEN"), "ArgoCD auth token")
	cmd.Flags().StringVar(&sourceApp, "source", "", "Source application name")
	cmd.Flags().StringVar(&targetApp, "target", "", "Target application name")
	cmd.Flags().BoolVar(&autoSync, "sync", false, "Auto-sync after promotion")

	cmd.MarkFlagRequired("source")
	cmd.MarkFlagRequired("target")

	if err := cmd.Execute(); err != nil {
		log.Fatal(err)
	}
}
```

### Usage

```bash
# Promote staging revision to production
./promote --source web-app-staging --target web-app-production --sync

# Output:
# Source app web-app-staging is at revision: abc1234
# Target app web-app-production is at revision: def5678
# Updated web-app-production target revision to abc1234
# Sync triggered for web-app-production
```

## Approach 2: Python CLI with Click

For teams more comfortable with Python, building CLI tools with the `click` library and the REST API is equally effective.

### Bulk Operations Tool

This tool performs operations on multiple applications matching a selector.

```python
#!/usr/bin/env python3
# argocd-bulk - Bulk operations for ArgoCD applications
import os
import sys
import json
import click
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

ARGOCD_URL = os.environ.get('ARGOCD_URL', 'https://argocd.company.com')
ARGOCD_TOKEN = os.environ.get('ARGOCD_AUTH_TOKEN', '')


def api_request(method, endpoint, data=None):
    """Make an authenticated request to ArgoCD API."""
    headers = {
        'Authorization': f'Bearer {ARGOCD_TOKEN}',
        'Content-Type': 'application/json'
    }
    resp = requests.request(
        method,
        f'{ARGOCD_URL}{endpoint}',
        headers=headers,
        json=data,
        verify=False,
        timeout=30
    )
    resp.raise_for_status()
    return resp.json()


def get_matching_apps(selector=None, project=None):
    """Get applications matching the given filters."""
    params = []
    if selector:
        params.append(f'selector={selector}')
    if project:
        params.append(f'projects={project}')

    query = '&'.join(params)
    endpoint = f'/api/v1/applications?{query}' if query else '/api/v1/applications'
    result = api_request('GET', endpoint)
    return result.get('items', [])


@click.group()
def cli():
    """ArgoCD bulk operations tool."""
    if not ARGOCD_TOKEN:
        click.echo('Error: ARGOCD_AUTH_TOKEN environment variable is required', err=True)
        sys.exit(1)


@cli.command()
@click.option('--selector', '-l', help='Label selector (e.g., team=backend)')
@click.option('--project', '-p', help='Project name filter')
@click.option('--format', 'fmt', type=click.Choice(['table', 'json']), default='table')
def status(selector, project, fmt):
    """Show status of matching applications."""
    apps = get_matching_apps(selector, project)

    if fmt == 'json':
        output = [{
            'name': a['metadata']['name'],
            'health': a.get('status', {}).get('health', {}).get('status', '?'),
            'sync': a.get('status', {}).get('sync', {}).get('status', '?'),
        } for a in apps]
        click.echo(json.dumps(output, indent=2))
        return

    # Table format
    click.echo(f"{'NAME':<40} {'HEALTH':<15} {'SYNC':<15} {'REVISION':<10}")
    click.echo('-' * 80)
    for a in apps:
        name = a['metadata']['name']
        health = a.get('status', {}).get('health', {}).get('status', '?')
        sync = a.get('status', {}).get('sync', {}).get('status', '?')
        rev = a.get('status', {}).get('sync', {}).get('revision', '?')[:7]
        click.echo(f'{name:<40} {health:<15} {sync:<15} {rev:<10}')

    click.echo(f'\nTotal: {len(apps)} applications')


@cli.command()
@click.option('--selector', '-l', help='Label selector')
@click.option('--project', '-p', help='Project name filter')
@click.option('--parallel', type=int, default=5, help='Max parallel syncs')
@click.option('--dry-run', is_flag=True, help='Show what would be synced')
def sync(selector, project, parallel, dry_run):
    """Sync all matching applications in parallel."""
    apps = get_matching_apps(selector, project)
    app_names = [a['metadata']['name'] for a in apps]

    if not app_names:
        click.echo('No matching applications found')
        return

    click.echo(f'Will sync {len(app_names)} applications:')
    for name in app_names:
        click.echo(f'  - {name}')

    if dry_run:
        click.echo('\n(dry-run mode, no syncs triggered)')
        return

    if not click.confirm('\nProceed with sync?'):
        return

    # Sync in parallel with a thread pool
    def sync_app(name):
        try:
            api_request('POST', f'/api/v1/applications/{name}/sync', {
                'prune': True
            })
            return name, 'success', None
        except Exception as e:
            return name, 'failed', str(e)

    results = []
    with ThreadPoolExecutor(max_workers=parallel) as executor:
        futures = {executor.submit(sync_app, name): name for name in app_names}
        for future in as_completed(futures):
            name, status_val, error = future.result()
            results.append((name, status_val, error))
            icon = 'OK' if status_val == 'success' else 'FAIL'
            click.echo(f'  [{icon}] {name}' + (f' - {error}' if error else ''))

    succeeded = sum(1 for _, s, _ in results if s == 'success')
    failed = sum(1 for _, s, _ in results if s == 'failed')
    click.echo(f'\nResults: {succeeded} succeeded, {failed} failed')


@cli.command()
@click.option('--selector', '-l', help='Label selector')
@click.option('--project', '-p', help='Project name filter')
def refresh(selector, project):
    """Force refresh all matching applications."""
    apps = get_matching_apps(selector, project)

    for a in apps:
        name = a['metadata']['name']
        try:
            api_request('GET', f'/api/v1/applications/{name}?refresh=normal')
            click.echo(f'  Refreshed: {name}')
        except Exception as e:
            click.echo(f'  Failed: {name} - {e}', err=True)


if __name__ == '__main__':
    cli()
```

### Usage

```bash
# Check status of all backend apps
./argocd-bulk status -l team=backend

# Sync all apps in the staging project, 10 at a time
./argocd-bulk sync -p staging --parallel 10

# Dry-run to see what would be synced
./argocd-bulk sync -l team=frontend --dry-run

# Force refresh all production apps
./argocd-bulk refresh -p production
```

## Building a Pre-Flight Check Tool

Before syncing, validate that the manifests will not cause issues. This tool checks for common problems.

```python
@cli.command()
@click.argument('app_name')
def preflight(app_name):
    """Run pre-flight checks before syncing an application."""
    click.echo(f'Running pre-flight checks for {app_name}...\n')

    app = api_request('GET', f'/api/v1/applications/{app_name}')
    checks_passed = True

    # Check 1: Is the app already synced?
    sync_status = app.get('status', {}).get('sync', {}).get('status')
    if sync_status == 'Synced':
        click.echo('[SKIP] Application is already in sync')
        return

    # Check 2: Are there any degraded resources?
    resources = app.get('status', {}).get('resources', [])
    degraded = [r for r in resources if r.get('health', {}).get('status') == 'Degraded']
    if degraded:
        click.echo(f'[WARN] {len(degraded)} resources are currently degraded:')
        for r in degraded:
            click.echo(f'       - {r["kind"]}/{r["name"]}')
        checks_passed = False
    else:
        click.echo('[PASS] No degraded resources')

    # Check 3: Check for resources that would be pruned
    out_of_sync = [r for r in resources if r.get('status') == 'OutOfSync']
    click.echo(f'[INFO] {len(out_of_sync)} resources will be updated')

    # Check 4: Verify the target revision exists
    source = app.get('spec', {}).get('source', {})
    click.echo(f'[INFO] Target revision: {source.get("targetRevision", "HEAD")}')

    if checks_passed:
        click.echo('\nAll pre-flight checks passed.')
    else:
        click.echo('\nWarnings found. Review before syncing.')
```

## Packaging and Distribution

Package your tools as container images or standalone binaries for easy distribution.

```dockerfile
# Dockerfile for the Python CLI tools
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY argocd_bulk.py /usr/local/bin/argocd-bulk
RUN chmod +x /usr/local/bin/argocd-bulk
ENTRYPOINT ["argocd-bulk"]
```

For Go tools, cross-compile for all platforms.

```bash
# Build for Linux, macOS, and Windows
GOOS=linux GOARCH=amd64 go build -o promote-linux-amd64 ./cmd/promote/
GOOS=darwin GOARCH=arm64 go build -o promote-darwin-arm64 ./cmd/promote/
GOOS=windows GOARCH=amd64 go build -o promote-windows-amd64.exe ./cmd/promote/
```

## Wrapping Up

Custom ArgoCD CLI tools let you encode your team's specific deployment workflows into repeatable, shareable commands. Whether you build them in Go with ArgoCD's native client library or in Python with the REST API, the pattern is the same: authenticate, query or mutate application state, and present the results clearly. Start with the operations your team does most often - status checks, bulk syncs, and environment promotions are the most common. For the full API reference, see [our complete ArgoCD REST API guide](https://oneuptime.com/blog/post/2026-02-26-how-to-use-argocd-rest-api-complete-crud-operations/view).
