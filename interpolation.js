var interpolation = {
    nearest(keyframes, { type }) {
        let before, after;

        for (let { position, value } of keyframes) {
            if (type == "number") value = parseFloat(value);
            if (position <= 0) {
                before = { position, value };
            } else {
                after ??= { position, value };
            }
        }

        if (before == undefined) return [after.value, { after }];
        if (after == undefined) return [before.value, { before }];

        if (Math.abs(before.position) < Math.abs(after.position))
            return [before.value, { before, after }];
        else return [after.value, { before, after }];
    },

    previous(keyframes, { type }) {
        let before, after;

        for (let { position, value } of keyframes) {
            if (type == "number") value = parseFloat(value);
            if (position <= 0) {
                before = { position, value };
            } else {
                after ??= { position, value };
            }
        }

        if (before == undefined) return [after.value, { after }];
        if (after == undefined) return [before.value, { before }];

        return [before.value, before];
    },

    linear(keyframes) {
        let before, after;

        for (let { position, value } of keyframes) {
            if (position <= 0) {
                before = { position, value };
            } else {
                after ??= { position, value };
            }
        }

        if (before == undefined) {
            return [after.value, { after }];
        }
        if (after == undefined) {
            return [before.value, { before }];
        }

        return [
            (before.value * Math.abs(after.position) +
                after.value * Math.abs(before.position)) /
                (Math.abs(after.position) + Math.abs(before.position)),
            { before, after },
        ];
    },

    polynomial(keyframes) {
        let sections = [];

        for (let { position, value, gradient } of keyframes) {
            if (sections.length == 0) {
                sections.push({
                    start: position,
                    end: position,
                    chunks: [],
                    constraints: 0,
                });
            }

            let chunks = sections[sections.length - 1].chunks;

            if (
                chunks.length != 0 &&
                chunks[chunks.length - 1].position == position
            ) {
                sections[sections.length - 1].chunks.pop();
            }

            sections[sections.length - 1].constraints++;
            sections[sections.length - 1].end = position;
            sections[sections.length - 1].chunks.push({
                position: position - sections[sections.length - 1].start,
                value,
                gradient,
            });

            if (gradient != undefined) {
                sections[sections.length - 1].constraints++;
                sections.push({
                    start: position,
                    end: position,
                    chunks: [{ position: 0, value, gradient }],
                    constraints: 2,
                });
            }
        }

        // find the current section
        let relevantSection = sections[0];

        for (let section of sections) {
            if (section.start < 0) relevantSection = section;
        }

        let constraintsMatrix = [];
        let constraintsVector = [];

        for (let { position, value, gradient } of relevantSection.chunks) {
            let posConstraint = [];
            for (let i = 0; i < relevantSection.constraints; i++) {
                posConstraint.push(Math.pow(position, i));
            }
            constraintsMatrix.push(posConstraint);
            constraintsVector.push([value]);

            if (!gradient) continue;

            let gradConstraint = [0];
            for (let i = 1; i < relevantSection.constraints; i++) {
                gradConstraint.push(i * Math.pow(position, i - 1));
            }
            constraintsMatrix.push(gradConstraint);
            constraintsVector.push([gradient]);
        }

        let inverseConstraint = matrix.invert(constraintsMatrix);
        let coefficients = matrix
            .multiply(inverseConstraint, constraintsVector)
            .flat();

        let interpolatedValue = 0;

        coefficients.forEach((coefficient, power) => {
            interpolatedValue +=
                coefficient * Math.pow(-relevantSection.start, power);
        });

        return [interpolatedValue, relevantSection];
    },
};
