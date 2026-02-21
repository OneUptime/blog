# How to Search for Ansible Galaxy Roles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ansible Galaxy, Roles, DevOps, Automation

Description: Learn how to search for Ansible Galaxy roles using the CLI and web interface to find reusable automation content for your infrastructure.

---

Ansible Galaxy is a massive repository of community-contributed roles that can save you hours of work. Instead of writing everything from scratch, you can find roles that handle common tasks like installing Nginx, configuring PostgreSQL, or hardening SSH. The trick is knowing how to search effectively so you find quality roles that actually work.

In this post, I will walk through every method for searching Ansible Galaxy roles, from the command line interface to the web portal, and share some tips for evaluating what you find.

## Searching with the ansible-galaxy CLI

The most direct way to search is from your terminal using the `ansible-galaxy search` command. This queries the Galaxy API and returns matching roles.

Here is a basic search for roles related to Nginx:

```bash
# Search for roles matching the keyword "nginx"
ansible-galaxy search nginx
```

This returns a table with the role name, description, and other metadata. The output looks something like this:

```
Found 85 roles matching your search:

 Name                                  Description
 ----                                  -----------
 geerlingguy.nginx                     Nginx installation role for Linux
 jdauphant.nginx                       Ansible role to install and configure nginx
 ...
```

You can narrow down results by filtering on specific fields. For example, to search only within a particular author's namespace:

```bash
# Search for nginx roles by a specific author
ansible-galaxy search nginx --author geerlingguy
```

You can also filter by platform if you only care about roles that support a specific OS:

```bash
# Search for nginx roles that support Ubuntu
ansible-galaxy search nginx --platforms Ubuntu
```

And you can filter by Galaxy tags (not to be confused with Ansible tags in playbooks):

```bash
# Search for roles tagged with "web" and "proxy"
ansible-galaxy search --galaxy-tags web,proxy
```

## Combining Search Filters

Filters can be combined to get very precise results. If you need a Docker role that runs on EL (Enterprise Linux) platforms and is tagged with "container":

```bash
# Combine multiple search filters
ansible-galaxy search docker --platforms EL --galaxy-tags container
```

## Getting Detailed Role Info

Once you spot a role that looks promising, use `ansible-galaxy info` to get the full details before installing it:

```bash
# Get detailed information about a specific role
ansible-galaxy info geerlingguy.nginx
```

This prints everything Galaxy knows about the role:

```
Role: geerlingguy.nginx
    description: Nginx installation role for Linux
    active: True
    company: Midwestern Mac, LLC
    created: 2013-10-22
    download_count: 12584932
    github_branch: master
    github_repo: ansible-role-nginx
    github_user: geerlingguy
    license: license (BSD, MIT)
    min_ansible_version: 2.4
    modified: 2024-09-15
    open_issues_count: 3
    platforms: Debian, Ubuntu, EL, Fedora
    versions: 2.0.0, 2.1.0, 2.2.0, ...
```

Pay attention to a few things here: the download count tells you how popular the role is, the modified date shows if it is actively maintained, and the open issues count hints at potential problems.

## Searching on the Galaxy Website

The web interface at https://galaxy.ansible.com provides a richer search experience. You get visual indicators, star ratings, and the ability to browse by category.

On the website, you can:

- Use the search bar with free-text queries
- Filter by content type (role vs collection)
- Sort by relevance, download count, or date
- Browse by platform, cloud provider, or category
- Read the role README without installing it

The web UI is particularly useful when you are exploring a new area and want to browse rather than search for a specific keyword.

## Using the Galaxy API Directly

For advanced use cases or scripting, you can query the Galaxy API directly. This is helpful if you want to build automation around role discovery.

Here is how to search the API with curl:

```bash
# Query the Galaxy API for roles matching "postgresql"
curl -s "https://galaxy.ansible.com/api/v1/search/roles/?search=postgresql" | python3 -m json.tool | head -50
```

You can also filter API results with query parameters:

```bash
# Search with platform and tag filters via the API
curl -s "https://galaxy.ansible.com/api/v1/search/roles/?search=postgresql&platforms=Ubuntu&tags=database" | python3 -m json.tool
```

If you want to script role evaluation, you can parse the JSON response:

```python
#!/usr/bin/env python3
# search_galaxy.py - Search Galaxy API and rank results by quality
import requests
import json

def search_roles(keyword, min_downloads=1000):
    url = f"https://galaxy.ansible.com/api/v1/search/roles/"
    params = {
        "search": keyword,
        "order_by": "-download_count",
        "page_size": 20
    }

    response = requests.get(url, params=params)
    data = response.json()

    results = []
    for role in data.get("results", []):
        # Filter by minimum download threshold
        if role.get("download_count", 0) >= min_downloads:
            results.append({
                "name": role["username"] + "." + role["name"],
                "downloads": role["download_count"],
                "description": role["description"],
                "github_repo": role.get("github_repo", "N/A")
            })

    return results

if __name__ == "__main__":
    roles = search_roles("nginx", min_downloads=5000)
    for role in roles:
        print(f"{role['name']:40s} Downloads: {role['downloads']:>10,}")
        print(f"  {role['description']}")
        print()
```

## Evaluating Role Quality

Finding a role is only half the battle. You also need to assess whether it is worth using. Here is a checklist I follow:

**Check the GitHub repository.** Every Galaxy role links back to its source. Visit the repo and look at:
- When the last commit was made
- How many open issues and PRs exist
- Whether the role has CI/CD tests (look for a `.github/workflows` or `.travis.yml` file)
- The quality of the README and documentation

**Look at download counts.** Roles with tens of thousands of downloads have been battle-tested by the community. A role with 50 downloads might work fine, but you are taking more of a risk.

**Check Ansible version compatibility.** Some older roles do not work with Ansible 2.10+ because of the collections migration. Look at the `min_ansible_version` field and test accordingly.

**Read the defaults.** Before installing, check the role's `defaults/main.yml` on GitHub. This tells you what variables you can configure and what the default behavior is.

## Searching for Collections Instead of Roles

With Ansible 2.10+, collections have become the preferred distribution format. To search for collections instead of roles:

```bash
# Search for collections (not roles)
ansible-galaxy collection list 2>/dev/null

# On the Galaxy website, toggle the content type filter to "Collection"
# Or search the API v3 endpoint for collections
curl -s "https://galaxy.ansible.com/api/v3/plugin/ansible/search/collection-versions/?keywords=nginx" | python3 -m json.tool
```

Many role authors have migrated their content into collections. If you find a role that has not been updated recently, check whether the author published a collection version instead.

## Practical Workflow

Here is how I typically approach finding a role for a project:

1. Start with a CLI search to see what exists: `ansible-galaxy search <keyword>`
2. Note the top 3-5 candidates by name
3. Run `ansible-galaxy info` on each to compare download counts and freshness
4. Visit the GitHub repos for the top 2 candidates
5. Check their CI status, open issues, and README quality
6. Install the winner into a test environment and verify it works

This process takes about 15 minutes and consistently leads to good choices. Skipping the evaluation step is how you end up with broken roles in production at 2 AM.

## Summary

Ansible Galaxy has thousands of roles covering nearly every infrastructure task you can think of. The `ansible-galaxy search` command with its `--author`, `--platforms`, and `--galaxy-tags` flags gives you precise results from the CLI. The web interface and API offer additional browsing and scripting capabilities. The key to success is not just finding roles but evaluating them carefully before you commit to using them in your automation stack.
