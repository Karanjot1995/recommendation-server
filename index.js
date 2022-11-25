const http = require("http");
const app = require("./app");
const server = http.createServer(app);

const port = 8085;

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
