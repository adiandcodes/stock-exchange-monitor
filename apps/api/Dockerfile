FROM node:22-bookworm
RUN apt-get update && apt-get install -y python3 python3-pip && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY . .
RUN npm install
RUN pip3 install --break-system-packages -r apps/api/requirements.txt
RUN npm run build:api
ENV NODE_ENV=production
EXPOSE 10000
CMD ["npm","run","start:api"]
