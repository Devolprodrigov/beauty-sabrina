export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { items } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Itens do pedido não enviados.' });
    }

    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const token = process.env.GITHUB_TOKEN;
    const branch = process.env.GITHUB_BRANCH || 'main';
    const path = 'products.json';

    if (!owner || !repo || !token) {
      return res.status(500).json({
        error: 'Variáveis do GitHub não configuradas.'
      });
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };

    const getResp = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
      { headers }
    );

    if (!getResp.ok) {
      const details = await getResp.text();
      return res.status(500).json({
        error: 'Erro ao ler products.json',
        details
      });
    }

    const fileData = await getResp.json();
    const currentContent = Buffer.from(fileData.content, 'base64').toString('utf8');
    const products = JSON.parse(currentContent);

    for (const orderItem of items) {
      const product = products.find(p => Number(p.id) === Number(orderItem.id));

      if (!product) {
        return res.status(400).json({
          error: `Produto com id ${orderItem.id} não encontrado.`
        });
      }

      const qty = Number(orderItem.qty || 0);
      const currentStock = Number(product.stock || 0);

      if (qty <= 0) {
        return res.status(400).json({
          error: `Quantidade inválida para ${product.name}.`
        });
      }

      if (qty > currentStock) {
        return res.status(400).json({
          error: `Estoque insuficiente para ${product.name}. Disponível: ${currentStock}.`
        });
      }

      product.stock = currentStock - qty;
    }

    const updatedContent = Buffer.from(
      JSON.stringify(products, null, 2),
      'utf8'
    ).toString('base64');

    const putResp = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'Atualiza estoque automaticamente após venda',
          content: updatedContent,
          sha: fileData.sha,
          branch
        })
      }
    );

    if (!putResp.ok) {
      const details = await putResp.text();
      return res.status(500).json({
        error: 'Erro ao salvar products.json',
        details
      });
    }

    return res.status(200).json({
      ok: true,
      message: 'Estoque atualizado com sucesso.'
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Erro interno ao atualizar estoque.',
      details: String(error?.message || error)
    });
  }
}
