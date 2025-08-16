var matrix = {
    invert(M) {
        if (M.length !== M[0].length) {
            return;
        }

        var i = 0,
            ii = 0,
            j = 0,
            dim = M.length,
            e = 0;
        // t = 0;
        var I = [],
            C = [];
        for (i = 0; i < dim; i += 1) {
            I[I.length] = [];
            C[C.length] = [];
            for (j = 0; j < dim; j += 1) {
                if (i == j) {
                    I[i][j] = 1;
                } else {
                    I[i][j] = 0;
                }

                C[i][j] = M[i][j];
            }
        }

        for (i = 0; i < dim; i += 1) {
            e = C[i][i];

            if (e == 0) {
                for (ii = i + 1; ii < dim; ii += 1) {
                    if (C[ii][i] != 0) {
                        for (j = 0; j < dim; j++) {
                            e = C[i][j];
                            C[i][j] = C[ii][j];
                            C[ii][j] = e;
                            e = I[i][j];
                            I[i][j] = I[ii][j];
                            I[ii][j] = e;
                        }
                        break;
                    }
                }
                e = C[i][i];
                if (e == 0) {
                    return;
                }
            }

            for (j = 0; j < dim; j++) {
                C[i][j] = C[i][j] / e;
                I[i][j] = I[i][j] / e;
            }

            for (ii = 0; ii < dim; ii++) {
                if (ii == i) {
                    continue;
                }

                e = C[ii][i];
                for (j = 0; j < dim; j++) {
                    C[ii][j] -= e * C[i][j];
                    I[ii][j] -= e * I[i][j];
                }
            }
        }

        return I;
    },

    multiply(a, b) {
        var aNumRows = a.length,
            aNumCols = a[0].length,
            // bNumRows = b.length,
            bNumCols = b[0].length,
            m = new Array(aNumRows);
        for (var r = 0; r < aNumRows; ++r) {
            m[r] = new Array(bNumCols);
            for (var c = 0; c < bNumCols; ++c) {
                m[r][c] = 0;
                for (var i = 0; i < aNumCols; ++i) {
                    m[r][c] += a[r][i] * b[i][c];
                }
            }
        }
        return m;
    },
};
