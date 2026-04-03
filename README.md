# MedAccess AI — Radiographic Diagnostic Platform

## Full-Stack Folder Structure

```
medaccess-ai/
├── backend/                          # FastAPI Python Service
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                   # FastAPI app entrypoint & CORS
│   │   ├── config.py                 # Pydantic Settings (env vars)
│   │   ├── auth.py                   # JWT practitioner authentication
│   │   ├── model_utils.py            # Keras model loader (singleton)
│   │   ├── image_pipeline.py         # OpenCV/PIL preprocessing & EXIF strip
│   │   ├── schemas.py                # Pydantic request/response models
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── analyze.py            # POST /v1/analyze
│   │   │   ├── patients.py           # CRUD /v1/patients
│   │   │   └── auth.py               # POST /v1/auth/token
│   │   ├── database.py               # SQLAlchemy async engine
│   │   └── storage.py                # S3/GCS presigned URL helpers
│   ├── models/
│   │   └── resnet50_chest.keras      # Production model weights (gitignored)
│   ├── tests/
│   │   ├── test_analyze.py
│   │   └── test_pipeline.py
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/                         # Next.js 14 App Router
│   ├── app/
│   │   ├── layout.tsx                # Root layout (fonts, providers)
│   │   ├── page.tsx                  # Redirect → /dashboard
│   │   ├── dashboard/
│   │   │   └── page.tsx              # ← MAIN DASHBOARD (delivered below)
│   │   ├── patients/
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   └── api/
│   │       └── auth/
│   │           └── [...nextauth]/route.ts
│   ├── components/
│   │   ├── ui/
│   │   │   ├── ConfidenceGauge.tsx   # Custom SVG Gauge
│   │   │   ├── ScanUploader.tsx      # Drag-drop upload zone
│   │   │   ├── PatientSidebar.tsx    # Patient list sidebar
│   │   │   └── DiagnosticCard.tsx    # Result display card
│   │   └── layout/
│   │       ├── Header.tsx
│   │       └── Providers.tsx         # QueryClient + Auth providers
│   ├── lib/
│   │   ├── api.ts                    # ← ANALYSIS API SERVICE (delivered below)
│   │   ├── queryKeys.ts              # TanStack Query key factory
│   │   └── utils.ts
│   ├── types/
│   │   └── medical.ts                # Shared TypeScript types
│   ├── public/
│   ├── tailwind.config.ts
│   ├── next.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── prisma/
│   ├── schema.prisma                 # ← DELIVERED BELOW
│   └── migrations/
│
├── infrastructure/
│   ├── docker-compose.yml            # Local dev stack
│   ├── nginx/
│   │   └── nginx.conf                # SSL termination, rate limiting
│   └── terraform/                    # AWS/GCP IaC (optional)
│
└── .github/
    └── workflows/
        └── ci.yml                    # Lint, test, docker build
