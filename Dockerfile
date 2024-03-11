FROM mhart/alpine-node:14

WORKDIR /app
COPY . .

RUN npm install --production

CMD ["npm", "run", "prod"]
