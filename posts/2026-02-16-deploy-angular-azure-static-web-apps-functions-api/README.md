# How to Deploy an Angular Application to Azure Static Web Apps with Azure Functions API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Angular, Azure, Static Web Apps, Azure Functions, Deployment, TypeScript, API

Description: Deploy an Angular application with an Azure Functions API backend to Azure Static Web Apps with automatic CI/CD and staging environments.

---

Angular applications pair naturally with Azure Static Web Apps. Angular's ahead-of-time compilation produces optimized static assets that the CDN distributes globally, and the integrated Azure Functions backend gives you a serverless API without managing separate infrastructure. Add automatic deployments from GitHub and staging environments for pull requests, and you have a deployment pipeline that requires almost zero maintenance.

This guide walks through building and deploying an Angular application with an Azure Functions API to Azure Static Web Apps.

## Prerequisites

- Node.js 18 or later
- Angular CLI installed (`npm i -g @angular/cli`)
- Azure account and CLI
- GitHub account
- Basic Angular knowledge

## Creating the Angular Application

Generate a new Angular project:

```bash
# Create a new Angular application with routing and SCSS
ng new angular-swa-app --routing --style=scss
cd angular-swa-app
```

## Building a Contact List Feature

Create a service that communicates with the API backend:

```typescript
// src/app/services/contact.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Contact interface matching the API response
export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  createdAt: string;
}

export interface CreateContact {
  name: string;
  email: string;
  phone: string;
  company: string;
}

@Injectable({
  providedIn: 'root',
})
export class ContactService {
  // API is served from the same domain under /api
  private apiUrl = '/api/contacts';

  constructor(private http: HttpClient) {}

  // Fetch all contacts from the API
  getContacts(): Observable<Contact[]> {
    return this.http.get<Contact[]>(this.apiUrl);
  }

  // Get a single contact by ID
  getContact(id: string): Observable<Contact> {
    return this.http.get<Contact>(`${this.apiUrl}/${id}`);
  }

  // Create a new contact
  createContact(contact: CreateContact): Observable<Contact> {
    return this.http.post<Contact>(this.apiUrl, contact);
  }

  // Update an existing contact
  updateContact(id: string, contact: Partial<Contact>): Observable<Contact> {
    return this.http.put<Contact>(`${this.apiUrl}/${id}`, contact);
  }

  // Delete a contact
  deleteContact(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Search contacts by name or email
  searchContacts(query: string): Observable<Contact[]> {
    return this.http.get<Contact[]>(`${this.apiUrl}?search=${encodeURIComponent(query)}`);
  }
}
```

Build the contact list component:

```typescript
// src/app/contacts/contact-list/contact-list.component.ts
import { Component, OnInit } from '@angular/core';
import { ContactService, Contact } from '../../services/contact.service';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';

@Component({
  selector: 'app-contact-list',
  template: `
    <div class="contact-list">
      <h2>Contacts</h2>

      <div class="search-bar">
        <input
          type="text"
          placeholder="Search contacts..."
          (input)="onSearch($event)"
        />
        <button (click)="showForm = !showForm">
          {{ showForm ? 'Cancel' : 'Add Contact' }}
        </button>
      </div>

      <!-- New contact form -->
      <form *ngIf="showForm" (ngSubmit)="addContact()" class="contact-form">
        <input [(ngModel)]="newContact.name" name="name" placeholder="Name" required />
        <input [(ngModel)]="newContact.email" name="email" placeholder="Email" required type="email" />
        <input [(ngModel)]="newContact.phone" name="phone" placeholder="Phone" />
        <input [(ngModel)]="newContact.company" name="company" placeholder="Company" />
        <button type="submit">Save</button>
      </form>

      <!-- Loading state -->
      <div *ngIf="loading" class="loading">Loading contacts...</div>

      <!-- Contact cards -->
      <div *ngFor="let contact of contacts" class="contact-card">
        <div class="contact-info">
          <h3>{{ contact.name }}</h3>
          <p>{{ contact.email }}</p>
          <p>{{ contact.phone }}</p>
          <span class="company">{{ contact.company }}</span>
        </div>
        <button class="delete" (click)="removeContact(contact.id)">Delete</button>
      </div>

      <div *ngIf="!loading && contacts.length === 0" class="empty">
        No contacts found.
      </div>
    </div>
  `,
})
export class ContactListComponent implements OnInit {
  contacts: Contact[] = [];
  loading = true;
  showForm = false;
  newContact = { name: '', email: '', phone: '', company: '' };

  private searchTerms = new Subject<string>();

  constructor(private contactService: ContactService) {}

  ngOnInit() {
    this.loadContacts();

    // Set up debounced search
    this.searchTerms
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) =>
          term
            ? this.contactService.searchContacts(term)
            : this.contactService.getContacts()
        )
      )
      .subscribe((contacts) => {
        this.contacts = contacts;
      });
  }

  loadContacts() {
    this.contactService.getContacts().subscribe({
      next: (contacts) => {
        this.contacts = contacts;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load contacts:', err);
        this.loading = false;
      },
    });
  }

  addContact() {
    this.contactService.createContact(this.newContact).subscribe({
      next: (contact) => {
        this.contacts.unshift(contact);
        this.newContact = { name: '', email: '', phone: '', company: '' };
        this.showForm = false;
      },
      error: (err) => console.error('Failed to create contact:', err),
    });
  }

  removeContact(id: string) {
    this.contactService.deleteContact(id).subscribe({
      next: () => {
        this.contacts = this.contacts.filter((c) => c.id !== id);
      },
      error: (err) => console.error('Failed to delete contact:', err),
    });
  }

  onSearch(event: Event) {
    const term = (event.target as HTMLInputElement).value;
    this.searchTerms.next(term);
  }
}
```

## Building the Azure Functions API

Create the API directory with the required structure:

```bash
# Create the API project
mkdir -p api/src/functions
cd api
npm init -y
npm install @azure/functions
```

Build the contacts API:

```javascript
// api/src/functions/contacts.js - Contacts API endpoints
const { app } = require('@azure/functions');

// In-memory data store (use a real database in production)
let contacts = [
  { id: '1', name: 'Alice Johnson', email: 'alice@example.com', phone: '555-0101', company: 'Acme Corp', createdAt: '2026-02-15T10:00:00Z' },
  { id: '2', name: 'Bob Smith', email: 'bob@example.com', phone: '555-0102', company: 'TechStart', createdAt: '2026-02-15T11:00:00Z' },
];

// GET /api/contacts - List contacts with optional search
app.http('getContacts', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'contacts',
  handler: async (request) => {
    const search = request.query.get('search')?.toLowerCase();

    let result = contacts;
    if (search) {
      // Filter contacts by name or email
      result = contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          c.email.toLowerCase().includes(search)
      );
    }

    return {
      jsonBody: result.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    };
  },
});

// GET /api/contacts/:id - Get a single contact
app.http('getContact', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'contacts/{id}',
  handler: async (request) => {
    const contact = contacts.find((c) => c.id === request.params.id);

    if (!contact) {
      return { status: 404, jsonBody: { error: 'Contact not found' } };
    }
    return { jsonBody: contact };
  },
});

// POST /api/contacts - Create a new contact
app.http('createContact', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'contacts',
  handler: async (request) => {
    const body = await request.json();

    // Basic validation
    if (!body.name || !body.email) {
      return { status: 400, jsonBody: { error: 'Name and email are required' } };
    }

    const newContact = {
      id: Date.now().toString(),
      name: body.name,
      email: body.email,
      phone: body.phone || '',
      company: body.company || '',
      createdAt: new Date().toISOString(),
    };

    contacts.push(newContact);
    return { status: 201, jsonBody: newContact };
  },
});

// DELETE /api/contacts/:id - Delete a contact
app.http('deleteContact', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'contacts/{id}',
  handler: async (request) => {
    const index = contacts.findIndex((c) => c.id === request.params.id);

    if (index === -1) {
      return { status: 404, jsonBody: { error: 'Contact not found' } };
    }

    contacts.splice(index, 1);
    return { status: 204 };
  },
});
```

## Static Web App Configuration

Create `staticwebapp.config.json` in the Angular project root:

```json
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/api/*", "/*.{css,js,png,jpg,svg,ico}"]
  },
  "routes": [
    {
      "route": "/api/*",
      "methods": ["GET", "POST", "PUT", "DELETE"]
    }
  ],
  "responseOverrides": {
    "404": {
      "rewrite": "/index.html",
      "statusCode": 200
    }
  }
}
```

The `navigationFallback` rule is essential for Angular's client-side routing. Without it, refreshing a page at `/contacts/123` would return a 404 because no file exists at that path on the server.

## Deploying to Azure

Push to GitHub and create the Static Web App:

```bash
# Initialize and push to GitHub
git add .
git commit -m "Angular app with contacts API"
gh repo create angular-swa-app --public --push --source .

# Create the Azure Static Web App
az staticwebapp create \
  --name angular-contacts-swa \
  --resource-group angular-swa-rg \
  --source https://github.com/YOUR_USERNAME/angular-swa-app \
  --location eastus \
  --branch main \
  --app-location "/" \
  --api-location "api" \
  --output-location "dist/angular-swa-app/browser" \
  --login-with-github
```

Note the `output-location`. Angular 17+ outputs build files to `dist/<project-name>/browser`. Older versions use `dist/<project-name>`. Check your `angular.json` to confirm.

## GitHub Actions Workflow

Azure generates a workflow file, but you may want to customize it for Angular-specific needs:

```yaml
# .github/workflows/azure-static-web-apps.yml
name: Azure Static Web Apps CI/CD

on:
  push:
    branches: [main]
  pull_request:
    types: [opened, synchronize, reopened, closed]
    branches: [main]

jobs:
  build_and_deploy:
    if: github.event_name == 'push' || (github.event_name == 'pull_request' && github.event.action != 'closed')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'

      - name: Build And Deploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "/"
          api_location: "api"
          output_location: "dist/angular-swa-app/browser"
        env:
          # Angular needs this for production builds
          NODE_ENV: production
```

## Local Development

Use the SWA CLI for local development that mirrors production:

```bash
# Install the SWA CLI
npm install -g @azure/static-web-apps-cli

# Start Angular dev server and API together
swa start http://localhost:4200 --api-location api --run "ng serve"
```

This gives you hot reload for both the Angular frontend and the Azure Functions API.

## Environment-Specific Configuration

Angular uses `environment.ts` files for configuration. For Azure Static Web Apps, keep the API base URL relative:

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: '/api',
};

// src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: '/api',
};
```

Since the API and frontend share the same domain, the relative `/api` path works in all environments.

## Wrapping Up

Azure Static Web Apps is a natural fit for Angular applications. The build-and-deploy pipeline handles Angular's production build, the CDN distributes your compiled assets globally, and the integrated Azure Functions backend gives you a serverless API without CORS headaches. The staging environments for pull requests are particularly useful for teams where designers or product managers want to preview changes before they ship. The whole setup takes about fifteen minutes from an empty directory to a deployed application, and ongoing deployments happen automatically on every push to your main branch.
