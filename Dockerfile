# ═══════════════════════════════════════════════════════
# CRM Kanban — Production Dockerfile (Multi-Stage Build)
# ═══════════════════════════════════════════════════════
#
# Stage 1 — Builder: installs terser and minifies all JS files
# Stage 2 — Server:  serves the minified assets via Nginx

# ─── Stage 1: Build (Minify JS) ───────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy source files
COPY . .

# Install terser (only devDependencies needed for build)
RUN npm install --include=dev

# Run the minification build script
RUN node build.mjs

# ─── Stage 2: Serve (Nginx) ───────────────────────────
FROM nginx:1.25-alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy only the minified web assets from builder stage
COPY --from=builder /app /usr/share/nginx/html/

# Remove non-web files from the final image
RUN rm -rf /usr/share/nginx/html/Dockerfile \
           /usr/share/nginx/html/nginx.conf \
           /usr/share/nginx/html/.dockerignore \
           /usr/share/nginx/html/docker-compose.yml \
           /usr/share/nginx/html/package.json \
           /usr/share/nginx/html/package-lock.json \
           /usr/share/nginx/html/build.mjs \
           /usr/share/nginx/html/node_modules \
           /usr/share/nginx/html/.git \
           /usr/share/nginx/html/supabase_schema.sql \
           /usr/share/nginx/html/README.md

# Expose HTTP port
EXPOSE 80

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
