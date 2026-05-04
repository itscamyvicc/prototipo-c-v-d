function iniciarMascaras() {

    const cpfInput = document.getElementById('cpf');
    const telefoneInput = document.getElementById('telefone');

    if (cpfInput) {
        cpfInput.addEventListener('input', function (e) {
            let value = e.target.value.replace(/\D/g, '').slice(0, 11);

            if (value.length <= 3) {
                value = value;
            } else if (value.length <= 6) {
                value = value.replace(/(\d{3})(\d+)/, '$1.$2');
            } else if (value.length <= 9) {
                value = value.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3');
            } else {
                value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
            }

            e.target.value = value;
        });
    }

    if (telefoneInput) {
        telefoneInput.addEventListener('input', function (e) {
            let value = e.target.value.replace(/\D/g, '').slice(0, 11);

            if (value.length <= 2) {
                value = value.replace(/(\d+)/, '($1');
            } else if (value.length <= 6) {
                value = value.replace(/(\d{2})(\d+)/, '($1) $2');
            } else if (value.length <= 10) {
                value = value.replace(/(\d{2})(\d{4})(\d+)/, '($1) $2-$3');
            } else {
                value = value.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
            }

            e.target.value = value;
        });
    }

}

iniciarMascaras();