FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

# NEXT_PUBLIC_* vars are injected at runtime via docker-compose env_file (.env.local)
CMD ["npm", "run", "dev"]
