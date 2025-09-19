# AgroSmart AI

## Overview

AgroSmart AI is a comprehensive agricultural technology platform that combines artificial intelligence with extensive plant knowledge to revolutionize crop disease detection and agricultural education. The application features AI-powered plant disease diagnosis through image analysis, a comprehensive plant library database, and an intuitive web interface designed for farmers and agricultural students. The platform aims to improve crop health monitoring, reduce agricultural losses, and provide accessible agricultural knowledge through modern web technologies.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Theme System**: Custom theme provider supporting light/dark modes with system preference detection

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with structured error handling and logging middleware
- **File Upload**: Multer middleware for handling image uploads with validation
- **Session Management**: Express sessions with PostgreSQL session store

### Database Architecture
- **Primary Database**: PostgreSQL with connection pooling
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Data Storage**: Structured tables for plants, diagnoses, and related metadata
- **In-Memory Fallback**: Memory-based storage service for development/testing

### AI Integration
- **Provider**: OpenAI GPT-5 for plant disease analysis
- **Image Processing**: Base64 image encoding for API transmission
- **Analysis Features**: Disease identification, confidence scoring, treatment recommendations, and severity assessment
- **Response Format**: Structured JSON responses with error handling

### Component Architecture
- **Design System**: Consistent component library with variants and theming
- **Modular Components**: Reusable UI components for plant cards, modals, forms, and charts
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Data Visualization**: Chart.js integration for plant growth requirement charts

### Data Management
- **Plant Library**: Comprehensive database of crop types with growth requirements, diseases, and care instructions
- **Diagnosis Storage**: Historical record keeping of AI analyses for tracking and improvement
- **Search and Filtering**: Real-time search capabilities with category-based filtering
- **Image Handling**: Secure image upload with size limits and type validation

## External Dependencies

- **Database**: Neon PostgreSQL serverless database for production data storage
- **AI Service**: OpenAI API for plant disease analysis and image recognition
- **UI Components**: Radix UI primitives for accessible component foundation
- **Charts**: Chart.js for data visualization and growth requirement displays
- **File Processing**: Multer for handling multipart form data and image uploads
- **Development**: Vite with React plugin for fast development and hot module replacement
- **Deployment**: Replit-specific plugins for development environment integration