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
    const existingIndex = pieces.findIndex(
      (piece) => piece.width === width && piece.height === height && piece.allowRotation === allowRotation
    );

    if (existingIndex !== -1) {
      pieces[existingIndex].quantity += quantity;
    } else {
      pieces.push({ width, height, quantity, allowRotation });
    }
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
      <td>${piece.width}x${piece.height}</td>
      <td>${piece.quantity}</td>
      <td>${piece.allowRotation ? 'Sí' : 'No'}</td>
      <td><span class="delete-icon" data-index="${index}">❌</span></td>
    `;
    tableBody.appendChild(row);
  });

  document.querySelectorAll('.delete-icon').forEach((icon) => {
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
  let totalPlates = 1;

  // Nueva lógica: agrupar piezas por tamaño y luego ordenar por área
  const groupedPieces = [...pieces].reduce((groups, piece) => {
    const key = `${piece.width}x${piece.height}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(piece);
    return groups;
  }, {});

  const sortedPieces = Object.values(groupedPieces)
    .flat() // Combinar las agrupaciones
    .sort((a, b) => {
      return (b.width * b.height) - (a.width * a.height);
    });

  const columns = [];

  ctx.fillStyle = '#ddd';
  ctx.fillRect(0, 0, MDF_WIDTH * scale, MDF_HEIGHT * scale);

  sortedPieces.forEach((piece) => {
    for (let i = 0; i < piece.quantity; i++) {
      let pieceWidth = piece.width;
      let pieceHeight = piece.height;

      if (piece.allowRotation && pieceHeight > pieceWidth) {
        [pieceWidth, pieceHeight] = [pieceHeight, pieceWidth];
      }

      let placed = false;

      for (const column of columns) {
        if (column.remainingHeight >= pieceHeight && column.width >= pieceWidth) {
          drawPiece(ctx, column.x, column.y, pieceWidth, pieceHeight, scale);
          column.y += pieceHeight + SAW_BLADE_THICKNESS;
          column.remainingHeight -= (pieceHeight + SAW_BLADE_THICKNESS);
          placed = true;
          break;
        }
      }

      if (!placed) {
        const columnX = columns.length > 0 ? columns[columns.length - 1].x + columns[columns.length - 1].width + SAW_BLADE_THICKNESS : 0;

        if (columnX + pieceWidth <= MDF_WIDTH) {
          columns.push({
            x: columnX,
            y: 0,
            width: pieceWidth,
            remainingHeight: MDF_HEIGHT
          });
          drawPiece(ctx, columnX, 0, pieceWidth, pieceHeight, scale);
          columns[columns.length - 1].y += pieceHeight + SAW_BLADE_THICKNESS;
          columns[columns.length - 1].remainingHeight -= (pieceHeight + SAW_BLADE_THICKNESS);
          placed = true;
        } else {
          totalPlates++;
          columns.length = 0;
          ctx.fillStyle = '#ddd';
          ctx.fillRect(0, 0, MDF_WIDTH * scale, MDF_HEIGHT * scale);

          columns.push({
            x: 0,
            y: 0,
            width: pieceWidth,
            remainingHeight: MDF_HEIGHT
          });
          drawPiece(ctx, 0, 0, pieceWidth, pieceHeight, scale);
          columns[columns.length - 1].y += pieceHeight + SAW_BLADE_THICKNESS;
          columns[columns.length - 1].remainingHeight -= (pieceHeight + SAW_BLADE_THICKNESS);
        }
      }
      usedArea += pieceWidth * pieceHeight;
    }
  });

  const totalArea = totalPlates * MDF_WIDTH * MDF_HEIGHT;
  const usagePercentage = (usedArea / totalArea) * 100;
  document.getElementById('usage-percentage').textContent = `
    Porcentaje de uso: ${usagePercentage.toFixed(2)}% (${totalPlates} placas usadas).
  `;
});

function drawPiece(ctx, x, y, width, height, scale) {
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 2; // Mejora la nitidez del borde
  ctx.strokeRect(x * scale, y * scale, width * scale, height * scale);
  ctx.fillStyle = 'black';
  ctx.font = `${Math.max(12 * scale, 12)}px Arial`; // Ajusta tamaño de fuente
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${width}x${height}`, (x + width / 2) * scale, (y + height / 2) * scale);
}
