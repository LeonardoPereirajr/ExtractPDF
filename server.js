const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { exec } = require('child_process');

const server = http.createServer(async (req, res) => {
    if (req.method === 'GET') {
        if (req.url === '/') {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
                <html>
                <head>
                    <style>
                        body {
                            font-size: 20px;
                            text-align: center;
                            background-color: #333; /* Cor de fundo escura */
                            color: #fff; /* Cor do texto branco */
                        }
                    </style>
                </head>
                <body>
                    <h2>Escolha a pasta dos PDFs:</h2>
                    <form action="/processar" method="post">
                        <input type="text" name="pastaPDF" placeholder="Caminho da pasta">
                        <button type="submit">Processar</button>
                    </form>
                </body>
                </html>
            `);
        }
    } else if (req.method === 'POST' && req.url === '/processar') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            const formData = new URLSearchParams(body);
            const pastaPDF = decodeURIComponent(formData.get('pastaPDF')); // Decodificar o caminho da pasta
            const outputCSVFile = "bonificacao_fevereiro_bemfarma.csv";

            // Executa o script pdf_extract.js
            exec('node pdf_extract.js', (error, stdout, stderr) => {
                if (error) {
                    console.error(`Erro ao executar o script: ${error.message}`);
                    return;
                }
                if (stderr) {
                    console.error(`Erro no script: ${stderr}`);
                    return;
                }
                console.log(`Resultado do script: ${stdout}`);
            });

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`<html><body><p>Arquivo CSV gerado: ${outputCSVFile}</p></body></html>`);
        });
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
