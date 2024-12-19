const MDF_WIDTH = 2600; // mm
const MDF_HEIGHT = 1830; // mm
const SAW_BLADE_THICKNESS = 3; // mm

const pieces = [];

document.getElementById('add-piece').addEventListener('click', () => {
  const width = parseInt(document.getElementById('piece-width').value);
  const height = parseInt(document.getElementById('piece-height').value);
  const quantity = parseInt(document.getElementById('piece-quantity').value);
  const allowRotation = document.getElementById('allow-rotation').checked;

  if (width > 0 && height > 0 && quantity > 0) {
    pieces.push({ width, height, quantity, allowRotation });
    updatePiecesTable();
  } else {
    alert('Por favor, ingrese valores válidos.');
  }
});

function updatePiecesTable() {
  const tableBody = document.getElementById('pieces-table').querySelector('tbody');
  tableBody.innerHTML = '';

  pieces.forEach((piece, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${piece.width}</td>
      <td>${piece.height}</td>
      <td>${piece.quantity}</td>
      <td>${piece.allowRotation ? 'Sí' : 'No'}</td>
      <td><span class="delete-icon" data-index="${index}">❌</span></td>
    `;
    tableBody.appendChild(row);
  });

  document.querySelectorAll('.delete-icon').forEach(icon => {
    icon.addEventListener('click', (e) => {
      const index = parseInt(e.target.getAttribute('data-index'));
      pieces.splice(index, 1);
      updatePiecesTable();
    });
  });
}

document.getElementById('optimize-cuts').addEventListener('click', () => {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const scaleX = canvas.width / MDF_WIDTH;
  const scaleY = canvas.height / MDF_HEIGHT;
  const scale = Math.min(scaleX, scaleY);

  let usedArea = 0;
  let totalPlates = 1; // Contador de placas usadas
  let currentPlatePieces = [];

  // Ordenamos las piezas por el lado común más largo (en este caso, el 390)
  const sortedPieces = [];
  pieces.forEach(piece => {
    for (let i = 0; i < piece.quantity; i++) {
      sortedPieces.push({ ...piece });
    }
  });

  // Agrupamos por el lado de 390mm (por ejemplo)
  const groups = [];
  sortedPieces.forEach(piece => {
    let placed = false;
    groups.forEach(group => {
      const groupHasCommonSide = group.some(p => p.width === piece.width || p.height === piece.height);
      if (groupHasCommonSide) {
        group.push(piece);
        placed = true;
      }
    });
    if (!placed) {
      groups.push([piece]);
    }
  });

  // Ahora optimizamos la colocación de las piezas
  let x = 0;
  let y = 0;
  let rowHeight = 0;

  ctx.fillStyle = '#ddd';
  ctx.fillRect(0, 0, MDF_WIDTH * scale, MDF_HEIGHT * scale);

  groups.forEach(group => {
    group.forEach((piece) => {
      let pieceWidth = piece.width;
      let pieceHeight = piece.height;

      // Si se permite la rotación, intentamos rotar la pieza para que se alinee con el lado común (390)
      if (piece.allowRotation && pieceWidth !== 390 && pieceHeight === 390) {
        // Rotamos la pieza
        [pieceWidth, pieceHeight] = [pieceHeight, pieceWidth];
      }

      // Colocamos las piezas dentro de la placa
      if (y + pieceHeight + SAW_BLADE_THICKNESS <= MDF_HEIGHT) {
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.strokeRect(x * scale, y * scale, pieceWidth * scale, pieceHeight * scale);
        ctx.fillStyle = 'black';
        ctx.font = `${36 * scale}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${pieceWidth}x${pieceHeight}`, (x + pieceWidth / 2) * scale, (y + pieceHeight / 2) * scale);

        usedArea += pieceWidth * pieceHeight;
        y += pieceHeight + SAW_BLADE_THICKNESS;
      } else {
        // Si no cabe, comprobamos si podemos comenzar una nueva columna
        if (x + pieceWidth + SAW_BLADE_THICKNESS <= MDF_WIDTH) {
          // Iniciamos una nueva columna
          x += pieceWidth + SAW_BLADE_THICKNESS;
          y = 0;
          rowHeight = 0;

          // Colocamos la pieza en la nueva columna
          ctx.strokeStyle = 'black';
          ctx.lineWidth = 1;
          ctx.strokeRect(x * scale, y * scale, pieceWidth * scale, pieceHeight * scale);
          ctx.fillStyle = 'black';
          ctx.font = `${36 * scale}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${pieceWidth}x${pieceHeight}`, (x + pieceWidth / 2) * scale, (y + pieceHeight / 2) * scale);

          usedArea += pieceWidth * pieceHeight;
          y += pieceHeight + SAW_BLADE_THICKNESS;
        }
      }
    });
  });

  const totalArea = totalPlates * MDF_WIDTH * MDF_HEIGHT;
  const usagePercentage = (usedArea / totalArea) * 100;
  document.getElementById('usage-percentage').textContent = `Porcentaje de uso: ${usagePercentage.toFixed(2)}% (${totalPlates} placas usadas)`;
});
