# How to Design a Healthcare Records Schema in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Schema Design, Healthcare, Data Modeling, FHIR

Description: Learn how to design a MongoDB schema for healthcare records covering patients, encounters, diagnoses, and medications with HIPAA-aligned data modeling patterns.

---

## Introduction

Healthcare applications require schemas that balance performance, flexibility for evolving clinical data, and compliance considerations. MongoDB's document model is well-suited to healthcare because it can embed related clinical data (like diagnoses and medications in an encounter) in one document, avoiding complex joins. This guide covers practical schema designs for core healthcare entities.

## Patient Document Schema

```javascript
{
  _id: ObjectId("..."),
  patientId: "P-2026-001234",  // Human-readable ID
  mrn: "MRN-987654",           // Medical Record Number

  demographics: {
    firstName: "Jane",
    lastName: "Smith",
    dateOfBirth: ISODate("1985-03-15"),
    gender: "female",
    ethnicity: "Hispanic",
    preferredLanguage: "en"
  },

  contact: {
    phone: "+1-555-123-4567",
    email: "jane.smith@email.com",
    address: {
      street: "123 Main St",
      city: "Portland",
      state: "OR",
      zip: "97201",
      country: "US"
    }
  },

  insurance: [
    {
      provider: "BlueCross BlueShield",
      memberId: "BCB-12345",
      groupNumber: "GRP-9876",
      isPrimary: true,
      effectiveDate: ISODate("2025-01-01"),
      expirationDate: ISODate("2025-12-31")
    }
  ],

  emergencyContacts: [
    {
      name: "John Smith",
      relationship: "spouse",
      phone: "+1-555-987-6543"
    }
  ],

  createdAt: ISODate("2026-01-10"),
  updatedAt: ISODate("2026-03-15"),
  isActive: true
}
```

## Clinical Encounter Document

```javascript
{
  _id: ObjectId("..."),
  encounterId: "ENC-2026-005432",
  patientId: ObjectId("..."),  // Reference to patient
  providerId: ObjectId("..."), // Reference to provider

  encounterType: "outpatient",  // inpatient, outpatient, emergency, telehealth
  status: "completed",

  timing: {
    admitDate: ISODate("2026-03-15T09:00:00Z"),
    dischargeDate: ISODate("2026-03-15T10:30:00Z"),
    durationMinutes: 90
  },

  facility: {
    name: "Portland General Clinic",
    facilityId: "FAC-001",
    department: "Internal Medicine"
  },

  chiefComplaint: "Annual wellness exam with hypertension follow-up",

  vitals: {
    bloodPressure: { systolic: 138, diastolic: 88, unit: "mmHg" },
    heartRate: 74,
    temperature: 98.6,
    weight: { value: 165, unit: "lbs" },
    height: { value: 65, unit: "inches" },
    bmi: 27.5,
    oxygenSaturation: 98,
    recordedAt: ISODate("2026-03-15T09:15:00Z")
  },

  diagnoses: [
    {
      code: "I10",              // ICD-10 code
      system: "ICD-10",
      description: "Essential (primary) hypertension",
      type: "primary",         // primary, secondary, admitting
      status: "active"
    },
    {
      code: "E11.9",
      system: "ICD-10",
      description: "Type 2 diabetes mellitus without complications",
      type: "secondary",
      status: "chronic"
    }
  ],

  procedures: [
    {
      code: "99396",
      system: "CPT",
      description: "Periodic preventive medicine exam, 40-64 years",
      performedAt: ISODate("2026-03-15T09:30:00Z"),
      providerId: ObjectId("...")
    }
  ],

  notes: {
    subjective: "Patient reports headaches 2-3x/week...",
    objective: "Blood pressure elevated at 138/88...",
    assessment: "Hypertension inadequately controlled on current regimen...",
    plan: "Increase lisinopril to 20mg daily. RTC in 4 weeks."
  }
}
```

## Medication Record

```javascript
{
  _id: ObjectId("..."),
  patientId: ObjectId("..."),
  encounterId: ObjectId("..."),

  medication: {
    name: "Lisinopril",
    rxnormCode: "29046",
    genericName: "lisinopril",
    brandName: "Zestril"
  },

  dosage: {
    dose: 20,
    unit: "mg",
    frequency: "once daily",
    route: "oral",
    form: "tablet"
  },

  prescribedBy: ObjectId("..."),
  prescribedAt: ISODate("2026-03-15T10:00:00Z"),

  startDate: ISODate("2026-03-15"),
  endDate: null,  // null = ongoing
  refillsRemaining: 5,

  status: "active",  // active, discontinued, on-hold, completed

  instructions: "Take in the morning with or without food. Avoid potassium supplements.",

  pharmacy: {
    name: "CVS Pharmacy",
    npi: "1234567890",
    phone: "+1-555-200-3000"
  }
}
```

## Lab Results Schema

```javascript
{
  _id: ObjectId("..."),
  patientId: ObjectId("..."),
  encounterId: ObjectId("..."),
  orderedBy: ObjectId("..."),

  panel: "Basic Metabolic Panel",
  orderedAt: ISODate("2026-03-15T09:45:00Z"),
  resultedAt: ISODate("2026-03-15T11:30:00Z"),
  status: "final",

  results: [
    {
      name: "Sodium",
      loincCode: "2951-2",
      value: 140,
      unit: "mEq/L",
      referenceRange: { low: 136, high: 145 },
      interpretation: "normal",
      flag: null
    },
    {
      name: "Glucose",
      loincCode: "2345-7",
      value: 118,
      unit: "mg/dL",
      referenceRange: { low: 70, high: 100 },
      interpretation: "high",
      flag: "H"
    }
  ]
}
```

## Key Indexes

```javascript
// Patient lookup
db.patients.createIndex({ mrn: 1 }, { unique: true });
db.patients.createIndex({ "demographics.lastName": 1, "demographics.dateOfBirth": 1 });

// Encounter queries
db.encounters.createIndex({ patientId: 1, "timing.admitDate": -1 });
db.encounters.createIndex({ "diagnoses.code": 1 });

// Medications
db.medications.createIndex({ patientId: 1, status: 1 });

// Lab results
db.labResults.createIndex({ patientId: 1, "results.loincCode": 1, resultedAt: -1 });
```

## Querying All Active Medications for a Patient

```javascript
db.medications.find({
  patientId: ObjectId("..."),
  status: "active"
}).sort({ prescribedAt: -1 });
```

## Querying Encounters by Diagnosis Code

```javascript
db.encounters.find({
  "diagnoses.code": "I10",
  "timing.admitDate": { $gte: ISODate("2026-01-01") }
}).sort({ "timing.admitDate": -1 });
```

## Summary

A MongoDB healthcare schema uses separate collections for patients, encounters, medications, and lab results, connected by patient and encounter references. Embed frequently co-accessed data (vitals, diagnoses, procedures) within encounter documents to minimize lookups, and use standardized coding systems (ICD-10, CPT, LOINC, RxNorm) for interoperability. Index on patient ID with date fields for time-based queries, and on diagnosis/procedure codes for population health analytics.
