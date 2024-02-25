const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const PDFParser = require('pdf-parse');
const ObjectsToCsv = require('objects-to-csv');

async function extractInfoFromPDF(pdfPath) {
    try {
        const pdf = await fs.promises.readFile(pdfPath);
        const data = await PDFParser(pdf);

        const dataPedidoMatch = data.text.match(/Data Pedido:\s*([\d/]+)/);
        const numeroPedidoMatch = data.text.match(/Nº Pedido:\s*(\d+)/);
        const razaoSocialMatch = data.text.match(/Razão Social:\s*([^\n]+)/);
        const observacoesMatch = data.text.match(/OBS:\s*([\d,.]+)/);
        const itemMatch = data.text.match(/Forma de Pagamento:\s*(.*?)(?=OBS:)/s); // Regex para capturar o texto entre "Forma de Pagamento:" e "OBS:"

        const dataPedido = dataPedidoMatch ? dataPedidoMatch[1] : null;
        const numeroPedido = numeroPedidoMatch ? numeroPedidoMatch[1] : null;
        const observacoes = observacoesMatch ? observacoesMatch[1] : null;
        const razaoSocial = razaoSocialMatch ? razaoSocialMatch[1].trim() : null;
        const item = itemMatch ? itemMatch[1].replace(/(à Vista \/ à Prazo \(Cheque\/Boleto\)|ITENS COMPLEMENTARES)/g, '').trim() : null; // Remove os caracteres indesejados

        const nomeArquivo = path.basename(pdfPath);

        return {
            arquivo: nomeArquivo,
            Data_pedido: dataPedido,
            Numero_pedido: numeroPedido,
            Distribuidor: razaoSocial,
            Item: item,
            Valor: observacoes
        };
    } catch (error) {
        console.error(`Erro ao processar o arquivo ${pdfPath}: ${error.message}`);
        return null;
    }
}

async function processPDFs(pastaPDF) {
    const pastaCaminho = pastaPDF.split('\\'); // Divide o caminho em partes usando a barra invertida como separador
    const pastaName = pastaCaminho[pastaCaminho.length - 1]; // Obtém o nome da última pasta
    const pastaAnterior = pastaCaminho[pastaCaminho.length - 2]; // Obtém o nome da penúltima pasta
    const outputCSVFile = `bonificacao_${pastaAnterior}_${pastaName}.csv`; // Nome do arquivo CSV

    const pdfFiles = fs.readdirSync(pastaPDF).filter(file => file.endsWith('.pdf'));

    const filesInfo = [];
    for (const pdfFile of pdfFiles) {
        const filePath = path.join(pastaPDF, pdfFile);
        const fileInfo = await extractInfoFromPDF(filePath);
        if (fileInfo) {
            filesInfo.push(fileInfo);
        }
    }

    const csv = new ObjectsToCsv(filesInfo);
    await csv.toDisk(outputCSVFile, { encoding: 'utf8', delimiter: ';' });

    console.log(`Arquivo CSV gerado: ${outputCSVFile}`);
}


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

            await processPDFs(pastaPDF);

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`<html><body><p>Arquivo CSV gerado: ${outputCSVFile}</p></body></html>`);
        });
    }
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
